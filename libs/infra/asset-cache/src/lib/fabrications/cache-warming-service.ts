import type { AssetCacheController } from '../controller/asset-cache-controller'

export interface CacheWarmingServiceOptions {
  controller: AssetCacheController
  routeGroups: Record<string, string[]>
}

export class CacheWarmingService {
  private readonly options: CacheWarmingServiceOptions

  constructor(options: CacheWarmingServiceOptions) {
    this.options = options
  }

  async warmRoute(pathname: string): Promise<void> {
    const groups = this.resolveGroups(pathname)
    for (const group of groups) {
      await this.options.controller.prefetchGroup(group)
    }
  }

  private resolveGroups(pathname: string): string[] {
    const exact = this.options.routeGroups[pathname]
    if (exact) return exact
    for (const [pattern, groups] of Object.entries(this.options.routeGroups)) {
      if (this.matches(pattern, pathname)) return groups
    }
    return []
  }

  private matches(pattern: string, pathname: string): boolean {
    if (!pattern.includes(':')) return pattern === pathname
    const patternParts = pattern.split('/').filter(Boolean)
    const pathParts = pathname.split('/').filter(Boolean)
    if (patternParts.length !== pathParts.length) return false
    return patternParts.every((part, i) =>
      part.startsWith(':') ? true : part === pathParts[i],
    )
  }
}
