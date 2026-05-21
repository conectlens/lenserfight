import type {
  AICreationOutput,
  GeneratedLensResult,
  GeneratedWorkflowResult,
  GenerationType,
} from './creation.types'

// ─── JSON extraction ──────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  // First try plain parse
  try {
    return JSON.parse(raw.trim())
  } catch {
    // Fall back: extract first {...} block (handles markdown fences or leading prose)
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        // ignore — will throw PARSE_ERROR below
      }
    }
    throw new Error('no JSON object found in response')
  }
}

// ─── Lens output parser ───────────────────────────────────────────────────────

function parseLensOutput(raw: string): GeneratedLensResult {
  const obj = extractJson(raw) as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''

  if (!title) throw new Error('missing title in lens response')
  if (content.length < 10) throw new Error('content too short in lens response')

  const suggestedTagSlugs = Array.isArray(obj.suggestedTagSlugs)
    ? (obj.suggestedTagSlugs as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
        .slice(0, 10)
    : []

  // Extract params from [[variable]] syntax in content AND from the params array
  const fromContent = [...content.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1])
  const fromArray = Array.isArray(obj.params)
    ? (obj.params as unknown[])
        .filter((p): p is { label: string } => typeof (p as { label?: unknown }).label === 'string')
        .map((p) => p.label)
    : []
  const seen = new Set<string>()
  const params: Array<{ label: string }> = []
  for (const label of [...fromContent, ...fromArray]) {
    if (!seen.has(label)) {
      seen.add(label)
      params.push({ label })
    }
  }

  return { title, content, description, suggestedTagSlugs, params }
}

// ─── Workflow output parser ───────────────────────────────────────────────────

function parseWorkflowOutput(raw: string): GeneratedWorkflowResult {
  const obj = extractJson(raw) as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''

  if (!title) throw new Error('missing title in workflow response')

  const suggestedLensIds = Array.isArray(obj.suggestedLensIds)
    ? (obj.suggestedLensIds as unknown[])
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 20)
    : []

  return { title, description, suggestedLensIds }
}

// ─── Unified parser ───────────────────────────────────────────────────────────

export function parseCreationOutput(raw: string, type: GenerationType): AICreationOutput {
  if (type === 'lens') {
    return { type: 'lens', result: parseLensOutput(raw) }
  }
  return { type: 'workflow', result: parseWorkflowOutput(raw) }
}
