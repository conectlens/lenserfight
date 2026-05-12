// Phase BJ — AI model conformance harness.
//
// Deterministic wrapper that runs a prompt against an arbitrary model
// provider and asserts the output conforms to a caller-supplied predicate
// (typically a JSON-schema validator). Keeps the model call behind an
// injectable `runModel` so unit tests do not need real API keys.


export interface ModelTestProviderInput {
  provider: string
  model: string
  prompt: string
  /** Optional max tokens / system message etc; opaque to the harness. */
  options?: Record<string, unknown>
}

export type ModelTestRunner = (input: ModelTestProviderInput) => Promise<{
  raw: unknown
  text?: string
}>

export interface ConformanceAssertion {
  (raw: unknown, text: string): true | { violations: string[] }
}

export interface ModelTestResult {
  passed: boolean
  durationMs: number
  promptHash: string
  raw: unknown
  text: string
  violations: string[]
}

export async function hashPrompt(prompt: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(prompt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return 'sha256:' + hex
}

export async function runModelConformanceTest(
  provider: string,
  model: string,
  prompt: string,
  assertFn: ConformanceAssertion,
  runModel: ModelTestRunner,
  options?: Record<string, unknown>,
): Promise<ModelTestResult> {
  const start = Date.now()
  const promptHash = await hashPrompt(prompt)

  let raw: unknown = null
  let text = ''
  let violations: string[] = []
  let passed = false

  try {
    const out = await runModel({ provider, model, prompt, options })
    raw = out.raw
    text = out.text ?? (typeof out.raw === 'string' ? out.raw : JSON.stringify(out.raw))
    const result = assertFn(raw, text)
    if (result === true) {
      passed = true
    } else {
      violations = result.violations
    }
  } catch (err) {
    violations = [`runner_error: ${(err as Error).message ?? String(err)}`]
  }

  return {
    passed,
    durationMs: Date.now() - start,
    promptHash,
    raw,
    text,
    violations,
  }
}

/**
 * Convenience assertion: parse `text` as JSON and pass when every required
 * key exists at the top level. Strings are accepted as-is for the key check.
 */
export function jsonShapeAssertion(requiredKeys: string[]): ConformanceAssertion {
  return (_raw, text) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      return { violations: ['invalid_json'] }
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { violations: ['expected_object_root'] }
    }
    const missing = requiredKeys.filter((k) => !(k in (parsed as Record<string, unknown>)))
    if (missing.length > 0) {
      return { violations: missing.map((k) => `missing_key:${k}`) }
    }
    return true
  }
}
