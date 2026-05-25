import type { ToolRecord } from '@lenserfight/types'

import { parseTemplateParams } from './parse-template-params'
import type { VersionParamBinding } from './types'

function resolveToolIdForTypeHint(
  typeHint: string | undefined,
  tools: ToolRecord[] | undefined,
  defaultToolId: string,
): string {
  if (!typeHint || !tools?.length) return defaultToolId
  return tools.find((t) => t.type === typeHint)?.id ?? defaultToolId
}

/**
 * Sync detected [[label]] tokens from content into version parameter bindings.
 * Content is the source of truth for which params exist; existing bindings
 * preserve toolId (and optional when still applicable).
 */
export function syncBindingsFromContent(
  rawContent: string,
  existing: VersionParamBinding[],
  defaultToolId: string,
  tools?: ToolRecord[],
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
    const toolId = resolveToolIdForTypeHint(ep.typeHint, tools, defaultToolId)
    return {
      label: ep.label,
      toolId,
      ...(ep.optional ? { optional: true } : {}),
    }
  })
}
