export type AssetCategory =
  | 'brand'
  | 'animations'
  | 'workflow-previews'
  | 'battle-assets'
  | 'lens-previews'
  | 'agent-media'
  | 'docs-media'
  | 'marketing'
  | 'ui-visuals'
  | 'public-static'

export const ASSET_CATEGORIES: readonly AssetCategory[] = [
  'brand',
  'animations',
  'workflow-previews',
  'battle-assets',
  'lens-previews',
  'agent-media',
  'docs-media',
  'marketing',
  'ui-visuals',
  'public-static',
] as const

export interface ParsedAssetUrl {
  category: AssetCategory
  identifier: string
  filename: string
  format: string
  isImmutable: boolean
  isValid: boolean
}

export interface AssetManifestEntryLike {
  url: string
  integrity?: string
  contentHash?: string
}
