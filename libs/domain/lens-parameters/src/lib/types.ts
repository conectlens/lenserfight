import type { CreateVersionParamInput, LensVersionParam } from '@lenserfight/types'

/** Parsed [[label]] token from template content. */
export interface ParamToken {
  label: string
  optional: boolean
}

export type VersionParamBinding = CreateVersionParamInput

export type HydratedVersionParam = LensVersionParam

export interface RenderTemplateOptions {
  /** When true, unset/empty params are left as `[[name]]` instead of substituted with ''. */
  keepUnsetTokens?: boolean
}
