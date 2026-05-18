import type { NodeOutputEnvelope } from '@lenserfight/types'

/** Upstream node result shape used when resolving edge output paths. */
export interface MappedSourceResult {
  status: string
  outputData?: Record<string, unknown>
  envelope?: NodeOutputEnvelope
}

/**
 * Resolve `source_output_key` against a completed upstream node.
 * Supports dotted paths into `output_data` (e.g. `data.summary`) and falls
 * back to drilling `envelope.data` with the same segments, then `envelope.output`.
 */
export function resolveMappedOutputValue(source: MappedSourceResult, sourceOutputKey: string): unknown {
  const path = (sourceOutputKey || 'output').trim()
  const flat = source.outputData?.[path]
  if (flat !== undefined && !path.includes('.')) {
    return flat
  }
  if (!path.includes('.')) {
    return source.envelope?.output ?? ''
  }

  const segments = path.split('.').filter(Boolean)
  let cur: unknown = source.outputData
  for (const seg of segments) {
    if (cur && typeof cur === 'object' && seg in (cur as object)) {
      cur = (cur as Record<string, unknown>)[seg]
    } else {
      cur = undefined
      break
    }
  }
  if (cur !== undefined) return cur

  if (source.envelope?.data && typeof source.envelope.data === 'object') {
    let d: unknown = source.envelope.data
    for (const seg of segments) {
      if (d && typeof d === 'object' && seg in (d as object)) {
        d = (d as Record<string, unknown>)[seg]
      } else {
        d = undefined
        break
      }
    }
    if (d !== undefined) return d
  }

  return source.envelope?.output ?? ''
}
