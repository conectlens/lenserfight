import type { AssetCategory } from './types'

export function buildCDNUrl(
  baseUrl: string,
  category: AssetCategory,
  identifier: string,
  filename: string,
): string {
  const cleanBase = baseUrl.replace(/\/+$/, '')
  const cleanFile = filename.replace(/^\/+/, '')
  const cleanId = identifier.replace(/^\/+|\/+$/g, '')
  return `${cleanBase}/${category}/${cleanId}/${cleanFile}`
}
