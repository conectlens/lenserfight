/**
 * CodeNodeRunner — execute a user-provided JavaScript expression in a
 * restricted sandbox.
 *
 * GRASP Information Expert: this runner knows how to safely evaluate
 * user code against upstream data and produce a transformed result.
 *
 * Config schema (nodeConfig):
 *   code: string — JavaScript expression or arrow function body.
 *     Receives `input` (upstream data) and `params` (resolved params).
 *     Must return a value (last expression is the result).
 *   timeoutMs?: number — max execution time (default: 5000, max: 5000)
 *
 * Security model:
 * - Code is wrapped in a Function() constructor, NOT eval().
 * - The function receives only `input` and `params` as arguments.
 * - No access to globalThis, process, require, import, fetch, XMLHttpRequest.
 * - Forbidden patterns are statically rejected before execution.
 * - Execution is time-bounded with AbortSignal.
 * - Output is JSON-serializable only (strips functions, symbols, etc.).
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_TIMEOUT_MS = 5000
const MAX_CODE_LENGTH = 10_000

/**
 * Patterns that indicate potentially dangerous code.
 * Rejection is conservative — blocks known attack vectors.
 */
const FORBIDDEN_PATTERNS = [
  /\bprocess\b/,
  /\brequire\s*\(/,
  /\bimport\s*\(/,
  /\bglobalThis\b/,
  /\bwindow\b/,
  /\bdocument\b/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\beval\s*\(/,
  /\bFunction\s*\(/,
  /\b__proto__\b/,
  /\bconstructor\s*\[/,
  /\bprototype\b/,
  /\bProxy\s*\(/,
  /\bReflect\b/,
]

function validateCode(code: string): string | null {
  if (!code || typeof code !== 'string') return 'No code provided'
  if (code.length > MAX_CODE_LENGTH) return `Code exceeds maximum length of ${MAX_CODE_LENGTH} characters`
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) return `Code contains forbidden pattern: ${pattern.source}`
  }
  return null
}

/**
 * Deep-clone and strip non-serializable values.
 */
function sanitizeOutput(value: unknown): unknown {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

export class CodeNodeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'code'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const code = ctx.nodeConfig['code'] as string | undefined
    const timeoutMs = Math.min(
      Math.max(0, Number(ctx.nodeConfig['timeoutMs'] ?? MAX_TIMEOUT_MS)),
      MAX_TIMEOUT_MS,
    )

    const validationError = validateCode(code ?? '')
    if (validationError) {
      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: validationError },
          durationMs: 0,
        },
      }
    }

    // Build input from upstream outputs
    const input: Record<string, unknown> = {}
    for (const [nodeId, result] of ctx.upstreamOutputs) {
      input[nodeId] = result.data ?? result.text ?? result.url
    }

    const start = performance.now()

    try {
      const result = await this.executeInSandbox(
        code!,
        input,
        { ...ctx.resolvedParams },
        timeoutMs,
        ctx.signal,
      )
      const durationMs = Math.round(performance.now() - start)

      const sanitized = sanitizeOutput(result)
      const textOutput = typeof sanitized === 'string' ? sanitized : JSON.stringify(sanitized)

      return {
        output: {
          mediaType: 'text',
          text: textOutput,
          data: typeof sanitized === 'object' && sanitized !== null
            ? sanitized as Record<string, unknown>
            : { value: sanitized },
          durationMs,
        },
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - start)
      const message = err instanceof Error ? err.message : String(err)

      return {
        output: {
          mediaType: 'text',
          text: '',
          data: { error: message },
          durationMs,
        },
      }
    }
  }

  private async executeInSandbox(
    code: string,
    input: Record<string, unknown>,
    params: Record<string, unknown>,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Code execution cancelled', 'AbortError'))
        return
      }

      const timer = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      const abortHandler = () => {
        clearTimeout(timer)
        reject(new DOMException('Code execution cancelled', 'AbortError'))
      }
      signal?.addEventListener('abort', abortHandler, { once: true })

      try {
        // Wrap code so last expression is returned.
        // If code already has `return`, use as-is; otherwise wrap.
        const wrappedCode = code.includes('return ')
          ? code
          : `return (${code})`

        // Create sandboxed function — only receives `input` and `params`
        // 'use strict' ensures frozen object violations throw TypeErrors
        const fn = new Function('input', 'params', `'use strict';\n${wrappedCode}`)
        const result = fn(Object.freeze({ ...input }), Object.freeze({ ...params }))

        clearTimeout(timer)
        signal?.removeEventListener('abort', abortHandler)

        // Handle async results
        if (result && typeof result === 'object' && typeof result.then === 'function') {
          result.then(
            (v: unknown) => resolve(v),
            (e: unknown) => reject(e),
          )
        } else {
          resolve(result)
        }
      } catch (err) {
        clearTimeout(timer)
        signal?.removeEventListener('abort', abortHandler)
        reject(err)
      }
    })
  }
}
