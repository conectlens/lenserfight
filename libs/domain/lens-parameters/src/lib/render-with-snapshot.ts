import type { LensVersionParam } from '@lenserfight/types'
import { resolveUuidRefs } from '@lenserfight/utils/text'

import { formatParamForPrompt } from './coerce-param-value'
import { normalizeParamLabel, paramTokenBracket } from './label-normalizer'
import { replaceNamedParamTokens } from './parse-param-token'
import type { RenderTemplateOptions } from './types'

const UUID_PARAM_REGEX =
  /\[\[:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\]\]/gi

/**
 * Renders a lens template body with an input snapshot, supporting [[label]] and [[:uuid]] tokens.
 */
export function renderTemplateWithSnapshot(
  templateBody: string,
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[],
  options: RenderTemplateOptions = {},
): string {
  const normalised = resolveUuidRefs(templateBody, versionParams)
  const paramByLabel = new Map(
    versionParams.map((p) => [normalizeParamLabel(p.label), p]),
  )

  return replaceNamedParamTokens(normalised, (match, parsed) => {
    const param = paramByLabel.get(parsed.label)
    const value = snapshot[parsed.label] ?? snapshot[param?.label ?? '']

    if (value === undefined || value === null || value === '') {
      return options.keepUnsetTokens ? match : ''
    }

    return param ? formatParamForPrompt(value, param) : String(value)
  })
}

/**
 * Rewrites human-readable [[Label]] tokens in content to canonical normalized labels
 * so DB replace and extractParams stay aligned.
 */
export function normalizeTemplateParamTokens(content: string): string {
  return replaceNamedParamTokens(content, (_, parsed) =>
    paramTokenBracket(parsed.label, parsed.optional),
  )
}

export { UUID_PARAM_REGEX }
export { NAMED_BRACKET_REGEX as NAMED_PARAM_REGEX } from './parse-param-token'
