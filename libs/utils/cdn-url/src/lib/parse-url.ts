import { ASSET_CATEGORIES, type AssetCategory, type ParsedAssetUrl } from './types'

const IMMUTABLE_IDENTIFIER = /^sha(?:256|384|512)-[a-zA-Z0-9_-]+$/

export function parseCDNUrl(url: string): ParsedAssetUrl {
  const fallback: ParsedAssetUrl = {
    category: 'public-static',
    identifier: '',
    filename: '',
    format: '',
    isImmutable: false,
    isValid: false,
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return fallback
  }

  const segments = parsed.pathname.split('/').filter(Boolean)
  if (segments.length < 3) return fallback

  const [first, ...rest] = segments
  const localePattern = /^[a-z]{2}(?:-[a-zA-Z0-9]+)?$/
  const effective = localePattern.test(first) ? rest : segments
  if (effective.length < 3) return fallback

  const [rawCategory, identifier, ...filenameParts] = effective
  const category = rawCategory as AssetCategory
  if (!ASSET_CATEGORIES.includes(category)) return fallback

  const filename = filenameParts.join('/')
  const dotIndex = filename.lastIndexOf('.')
  const format = dotIndex >= 0 ? filename.slice(dotIndex + 1) : ''

  return {
    category,
    identifier,
    filename,
    format,
    isImmutable: IMMUTABLE_IDENTIFIER.test(identifier),
    isValid: true,
  }
}

export function isImmutableURL(url: string): boolean {
  return parseCDNUrl(url).isImmutable
}
