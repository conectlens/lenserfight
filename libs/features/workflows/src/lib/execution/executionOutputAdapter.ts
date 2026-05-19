/**
 * Execution output adapter — registry-based view model factory.
 *
 * Separates payload detection from rendering (OCP). New node output shapes
 * can be supported by extending the detection chain below without modifying
 * any existing renderer.
 *
 * Renderers depend on ExecutionOutputViewModel, not on raw backend payloads,
 * so backend schema changes are absorbed here at the boundary layer.
 */

export type ExecutionOutputType =
  | 'text'
  | 'markdown'
  | 'llm_response'
  | 'image'
  | 'video'
  | 'audio'
  | 'table'
  | 'array'
  | 'json'

export interface ExecutionOutputViewModel {
  /** Detected payload category — drives renderer strategy selection. */
  type: ExecutionOutputType
  /** One-line human-readable summary shown above detailed sections. */
  summary: string
  /** Primary text content — present for text / markdown / llm_response. */
  text?: string
  /** Media URL — present for image / video / audio. */
  url?: string
  mimeType?: string
  /**
   * Human-readable key-value metadata — model name, token counts, provider.
   * Values are already formatted as display strings.
   */
  metadata?: Record<string, string | number>
  /**
   * Full raw payload, always present — enables Raw JSON collapsible section
   * without any additional parsing by the caller.
   */
  rawPayload: Record<string, unknown>
  /** Character length of the raw JSON payload — used for safe truncation. */
  size: number
}

/**
 * Adapts a raw `output_data` payload into a typed view model.
 *
 * Pure function — no side effects, fully memoizable at the call site.
 * Detection is ordered from most-specific to most-generic so the first
 * matching branch wins and later ones serve as catch-alls.
 */
export function adaptExecutionOutput(
  data: Record<string, unknown>,
): ExecutionOutputViewModel {
  const size = JSON.stringify(data).length
  const mediaType = data['mediaType'] as string | undefined
  const mimeType   = data['mimeType']   as string | undefined
  const url        = data['url']         as string | undefined
  // Normalise text field — nodes emit either `output` or `text` depending on type.
  const text = (data['output'] ?? data['text']) as string | undefined

  // ── Image ──────────────────────────────────────────────────────────────────
  if ((mediaType === 'image' || mimeType?.startsWith('image/')) && url) {
    return {
      type: 'image',
      summary: 'Image generated',
      url,
      mimeType: mimeType ?? 'image/*',
      rawPayload: data,
      size,
    }
  }

  // ── Video ──────────────────────────────────────────────────────────────────
  if ((mediaType === 'video' || mimeType?.startsWith('video/')) && url) {
    return {
      type: 'video',
      summary: 'Video generated',
      url,
      mimeType: mimeType ?? 'video/*',
      rawPayload: data,
      size,
    }
  }

  // ── Audio ──────────────────────────────────────────────────────────────────
  if ((mediaType === 'audio' || mimeType?.startsWith('audio/')) && url) {
    return {
      type: 'audio',
      summary: 'Audio generated',
      url,
      mimeType: mimeType ?? 'audio/*',
      rawPayload: data,
      size,
    }
  }

  // ── LLM response — has model/provider metadata attached by the engine ──────
  // The engine writes provider route into `_wf.providerRoute`; legacy runners
  // write it directly into `metadata`. We check both locations.
  const wf = data['_wf'] as Record<string, unknown> | undefined
  const providerRoute = wf?.['providerRoute'] as Record<string, unknown> | undefined
  const metaBlock = (data['metadata'] ?? {}) as Record<string, unknown>
  const modelId  = (metaBlock['modelId']  ?? providerRoute?.['modelId'])  as string | undefined
  const provider = (metaBlock['provider'] ?? providerRoute?.['provider']) as string | undefined

  if (text && typeof text === 'string' && (modelId || provider)) {
    const meta: Record<string, string | number> = {}
    if (modelId) meta['Model'] = modelId
    if (provider) meta['Provider'] = provider
    const inputTokens  = metaBlock['inputTokens']  as number | undefined
    const outputTokens = metaBlock['outputTokens'] as number | undefined
    if (inputTokens  != null) meta['Input tokens']  = inputTokens
    if (outputTokens != null) meta['Output tokens'] = outputTokens

    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
    const summary = `${wordCount} word${wordCount !== 1 ? 's' : ''}${modelId ? ` · ${modelId}` : ''}`
    return { type: 'llm_response', summary, text, metadata: meta, rawPayload: data, size }
  }

  // ── Plain text / markdown ─────────────────────────────────────────────────
  if (text && typeof text === 'string') {
    // Lightweight markdown heuristic — avoids importing a full parser.
    const isMarkdown = /^#{1,6} |\*\*|```|^- |\n- /m.test(text)
    const snippet    = text.slice(0, 90).replace(/\n/g, ' ').trim()
    const summary    = snippet + (text.length > 90 ? '…' : '')
    return {
      type: isMarkdown ? 'markdown' : 'text',
      summary,
      text,
      rawPayload: data,
      size: text.length,
    }
  }

  // ── Array / table ─────────────────────────────────────────────────────────
  const items = data['items'] ?? data['rows'] ?? data['results']
  if (Array.isArray(items)) {
    const isTable =
      items.length > 0 && typeof items[0] === 'object' && items[0] !== null
    return {
      type: isTable ? 'table' : 'array',
      summary: `${items.length} item${items.length !== 1 ? 's' : ''}`,
      rawPayload: data,
      size,
    }
  }

  // ── Generic JSON (catch-all) ───────────────────────────────────────────────
  const visibleKeys = Object.keys(data).filter((k) => !k.startsWith('_'))
  return {
    type: 'json',
    summary: `${visibleKeys.length} field${visibleKeys.length !== 1 ? 's' : ''}`,
    rawPayload: data,
    size,
  }
}
