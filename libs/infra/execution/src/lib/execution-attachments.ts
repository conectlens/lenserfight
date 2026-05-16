import type { ExecutionInputAttachment } from './execution.types'

const MAX_ATTACHMENTS = 8

/** Heuristic: treat obvious image URLs in rendered label values as vision attachments. */
export function inferAttachmentsFromRendered(rendered: Record<string, unknown>): ExecutionInputAttachment[] {
  const out: ExecutionInputAttachment[] = []
  const seen = new Set<string>()

  for (const val of Object.values(rendered)) {
    if (out.length >= MAX_ATTACHMENTS) break
    if (typeof val !== 'string') continue
    const t = val.trim()
    if (t.length < 12 || !/^https?:\/\//i.test(t)) continue
    if (seen.has(t)) continue

    const looksImage =
      /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(t) ||
      /\/image\//i.test(t) ||
      /fal\.media|replicate\.delivery|oaidalleapiprodcus/i.test(t)

    if (looksImage) {
      seen.add(t)
      out.push({ kind: 'image', url: t })
    }
  }

  return out
}
