import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import { normalizeCDNUrl, normalizeToCacheKey } from '@lenserfight/utils/cdn-url'

export class AssetResolver {
  private readonly env: string

  constructor(env: string) {
    this.env = env
  }

  toCacheKey(url: string): string | null {
    return normalizeToCacheKey(url, this.env)
  }

  toNamespacedKey(category: AssetCategory, contentHash: string): string {
    return `lf:${this.env}:${category}:${contentHash}`
  }

  normalize(url: string): string {
    return normalizeCDNUrl(url)
  }
}
