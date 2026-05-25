import { extractParams } from '@lenserfight/utils/text'

import { normalizeParamLabel } from './label-normalizer'
import type { ParamToken } from './types'

/**
 * Parses [[label]] / [[label!]] tokens from template content into canonical ParamTokens.
 */
export function parseTemplateParams(content: string): ParamToken[] {
  return extractParams(content).map((p) => ({
    label: normalizeParamLabel(p.name),
    optional: !!p.optional,
  }))
}
