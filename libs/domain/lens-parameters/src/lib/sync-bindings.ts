import { parseTemplateParams } from './parse-template-params'
import type { VersionParamBinding } from './types'

/**
 * Sync detected [[label]] tokens from content into version parameter bindings.
 * Content is the source of truth for which params exist; existing bindings
 * preserve toolId (and optional when still applicable).
 */
export function syncBindingsFromContent(
  rawContent: string,
  existing: VersionParamBinding[],
  defaultToolId: string,
): VersionParamBinding[] {
  if (!defaultToolId) return existing

  const extracted = parseTemplateParams(rawContent)
  const prevMap = new Map(existing.map((p) => [p.label, p]))

  return extracted.map((ep) => {
    const prev = prevMap.get(ep.label)
    if (prev) {
      if (prev.optional !== ep.optional) {
        return ep.optional
          ? { ...prev, optional: true }
          : { label: prev.label, toolId: prev.toolId }
      }
      return prev
    }
    return {
      label: ep.label,
      toolId: defaultToolId,
      ...(ep.optional ? { optional: true } : {}),
    }
  })
}
