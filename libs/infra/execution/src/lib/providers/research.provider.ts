import type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType } from '../execution.types'

/**
 * Research Provider — Implements `kind:research` nodes.
 *
 * Responsibility:
 *   1. Optionally retrieve evidence from a pluggable retrieval backend (Brave,
 *      Exa, Tavily, custom) exposed via `input.params.retrievalBackend`.
 *      Without a backend configured the provider operates in "synthesis-only"
 *      mode — delegating to the wrapped base LLM provider.
 *   2. Delegate to a text LLM (the `baseProviderId` passed via params) to
 *      synthesise findings into a research brief.
 *   3. Coerce the LLM output into the canonical research envelope:
 *
 *        {
 *          findings:   Array<{ claim: string; source?: string; confidence?: number }>,
 *          summary:    string,
 *          open_questions: string[]
 *        }
 *
 * The research lens prompt (see 40_lens_chain_templates.sql) already instructs
 * the model to emit this shape; the provider just validates + coerces.
 */

export interface ResearchRetrievalHit {
  title?: string
  url?: string
  snippet?: string
  score?: number
}

export interface ResearchRetrievalBackend {
  readonly id: string
  search(query: string, limit?: number): Promise<ResearchRetrievalHit[]>
}

interface ResearchEnvelope {
  findings: Array<{ claim: string; source?: string; confidence?: number }>
  summary: string
  open_questions: string[]
}

export class ResearchProvider implements IExecutionProvider {
  readonly id = 'research'
  readonly supportedMediaTypes: MediaType[] = ['text']

  async execute(modelId: string, input: ExecutionInput, signal?: AbortSignal): Promise<ExecutionResult> {
    const start = Date.now()
    const params = input.params ?? {}

    // Pluggable retrieval: when a backend is wired the provider prepends hits
    // to the synthesis prompt so the LLM grounds its findings in real sources.
    const backend = params['retrievalBackend'] as ResearchRetrievalBackend | undefined
    const topic = typeof params['topic'] === 'string' ? (params['topic'] as string) : undefined
    const retrievalLimit = Number(params['retrievalLimit'] ?? 8)

    let retrievalBlock = ''
    let hits: ResearchRetrievalHit[] = []
    if (backend && topic) {
      hits = await backend.search(topic, retrievalLimit)
      retrievalBlock = formatRetrievalBlock(hits)
    }

    const baseProviderId = typeof params['baseProviderId'] === 'string'
      ? (params['baseProviderId'] as string)
      : 'openai'
    const baseModelId = typeof params['baseModelId'] === 'string'
      ? (params['baseModelId'] as string)
      : modelId

    // Lazy import to avoid a require cycle with execution.registry (which imports this provider).
    const { getExecutionProvider } = await import('../execution.registry')
    const baseProvider = getExecutionProvider(baseProviderId)
    const synthesisPrompt = retrievalBlock
      ? `${retrievalBlock}\n\n---\n\n${input.prompt}`
      : input.prompt

    const base = await baseProvider.execute(baseModelId, { prompt: synthesisPrompt, params }, signal)

    const envelope = coerceResearchEnvelope(base.text ?? '', hits)

    return {
      mediaType: 'text',
      text: JSON.stringify(envelope, null, 2),
      mimeType: 'application/json',
      durationMs: Date.now() - start,
      data: envelope as unknown as Record<string, unknown>,
      metadata: {
        modelId,
        baseProviderId,
        baseModelId,
        retrievedHits: hits.length,
        retrievalBackend: backend?.id ?? null,
      },
    }
  }
}

function formatRetrievalBlock(hits: ResearchRetrievalHit[]): string {
  if (hits.length === 0) return ''
  const body = hits
    .map((hit, i) => {
      const header = `[${i + 1}] ${hit.title ?? '(untitled)'}${hit.url ? ` — ${hit.url}` : ''}`
      const snippet = hit.snippet ? `    ${hit.snippet}` : ''
      return [header, snippet].filter(Boolean).join('\n')
    })
    .join('\n\n')
  return `Retrieved evidence (cite as [n]):\n\n${body}`
}

function coerceResearchEnvelope(raw: string, hits: ResearchRetrievalHit[]): ResearchEnvelope {
  const trimmed = raw.trim()
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      return normaliseEnvelope(parsed, hits)
    } catch {
      // Fall through.
    }
  }

  // Fallback: treat the whole output as the summary, synthesise findings from
  // retrieval hits so downstream lenses still get something structured.
  return {
    findings: hits.map((hit) => ({
      claim: hit.snippet ?? hit.title ?? '(no snippet)',
      source: hit.url ?? hit.title ?? undefined,
      confidence: typeof hit.score === 'number' ? hit.score : undefined,
    })),
    summary: trimmed,
    open_questions: [],
  }
}

function normaliseEnvelope(parsed: Record<string, unknown>, hits: ResearchRetrievalHit[]): ResearchEnvelope {
  const findings = Array.isArray(parsed['findings'])
    ? (parsed['findings'] as Array<Record<string, unknown>>).map((f) => ({
        claim: String(f['claim'] ?? f['finding'] ?? ''),
        source: typeof f['source'] === 'string' ? (f['source'] as string) : undefined,
        confidence: typeof f['confidence'] === 'number' ? (f['confidence'] as number) : undefined,
      }))
    : hits.map((hit) => ({
        claim: hit.snippet ?? hit.title ?? '',
        source: hit.url ?? hit.title ?? undefined,
      }))

  const summary = typeof parsed['summary'] === 'string'
    ? (parsed['summary'] as string)
    : ''

  const open = parsed['open_questions']
  const open_questions = Array.isArray(open)
    ? (open as unknown[]).map((q) => String(q))
    : []

  return { findings, summary, open_questions }
}
