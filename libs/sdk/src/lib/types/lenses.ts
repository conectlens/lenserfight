// SDK public types for Lenses

export type SdkLensKind =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'music'
  | 'research'
  | 'pdf'
  | 'transform'
  | 'orchestration'
  | 'validation'
  | 'routing'

export type SdkVisibility = 'public' | 'community' | 'private'
export type SdkContentStatus = 'draft' | 'published' | 'archived'

export interface SdkLensAuthor {
  id: string
  handle: string
  displayName: string
  avatarUrl: string | null
}

export interface SdkLensTag {
  id: string
  slug: string
  name: string
}

export interface SdkLensSummary {
  id: string
  title: string
  description: string | null
  author: SdkLensAuthor
  tags: SdkLensTag[]
  visibility: SdkVisibility
  status: SdkContentStatus
  outputKind: SdkLensKind | null
  latestVersionNumber: number | null
  createdAt: string
}

export interface SdkLensDetail extends SdkLensSummary {
  content: string
  parentLensId: string | null
  headVersionId: string | null
  latestPublishedVersion: SdkLensVersion | null
  reactionCounts: Record<string, number>
}

export interface SdkLensVersionSummary {
  id: string
  lensId: string
  versionNumber: number
  status: SdkContentStatus
  changelog: string | null
  parameterCount: number
  createdAt: string
}

export interface SdkLensVersion extends SdkLensVersionSummary {
  templateBody: string
  publishedAt: string | null
  parameters: SdkLensParameter[]
}

export interface SdkLensParameter {
  id: string
  label: string
  toolId: string
  optional: boolean
  tool: SdkParameterTool
}

export interface SdkParameterTool {
  id: string
  key: string
  label: string | null
  description: string | null
  category: 'input' | 'media' | 'execution' | 'battle' | 'system'
  type: string
  required: boolean
  placeholder: string | null
  helpText: string | null
  options: Array<{ label: string; value: string }> | null
  validationSchema: Record<string, unknown> | null
}

export interface LensBrowseFilters {
  search?: string
  tag?: string
  kind?: SdkLensKind
  status?: SdkContentStatus
}

export interface SdkResolvedTemplate {
  resolvedPrompt: string
  lensId: string
  versionId: string
  lensTitle: string
  lensDescription: string | null
  /** Parameter labels whose values were substituted. */
  paramsUsed: string[]
  /** Required parameter labels that were missing from the supplied values. */
  missing: string[]
}
