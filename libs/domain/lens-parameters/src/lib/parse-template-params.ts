import { extractNamedParamTokens } from './parse-param-token'
import type { ParamToken } from './types'

/**
 * Parses [[label]] / [[label!]] / [[label:type]] tokens from template content.
 */
export function parseTemplateParams(content: string): ParamToken[] {
  return extractNamedParamTokens(content).map((p) => ({
    label: p.label,
    optional: p.optional,
    ...(p.typeHint ? { typeHint: p.typeHint } : {}),
  }))
}
