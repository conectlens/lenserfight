import type { LensVersionParam } from '@lenserfight/types'
import { resolveUuidRefs } from '@lenserfight/utils/text'

import { formatParamForPrompt } from './coerce-param-value'
import { normalizeParamLabel, paramTokenBracket } from './label-normalizer'
import type { RenderTemplateOptions } from './types'

const NAMED_PARAM_REGEX = /\[\[(\w[\w \-_]*!?)\]\]/g
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

  return normalised.replace(NAMED_PARAM_REGEX, (match, raw: string) => {
    const trimmed = raw.trim()
    const optional = trimmed.endsWith('!')
    const name = normalizeParamLabel(optional ? trimmed.slice(0, -1) : trimmed)
    const param = paramByLabel.get(name)
    const value = snapshot[name] ?? snapshot[param?.label ?? '']

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
  return content.replace(NAMED_PARAM_REGEX, (_, raw: string) => {
    const trimmed = String(raw).trim()
    const optional = trimmed.endsWith('!')
    const core = optional ? trimmed.slice(0, -1).trimEnd() : trimmed
    const label = normalizeParamLabel(core)
    return paramTokenBracket(label, optional)
  })
}

export { UUID_PARAM_REGEX, NAMED_PARAM_REGEX }
