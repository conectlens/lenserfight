export interface CDNFetchOptions {
  etag?: string
  signal?: AbortSignal
  expectedIntegrity?: string
  expectedMimeType?: string
  maxResponseBytes?: number
  cacheTags?: string[]
}

export type CloudflareCacheStatus =
  | 'HIT'
  | 'MISS'
  | 'EXPIRED'
  | 'STALE'
  | 'BYPASS'
  | 'REVALIDATED'
  | 'UPDATING'
  | 'DYNAMIC'
  | 'NONE'
  | 'unknown'

export interface ICDNProvider {
  fetch(url: string, options?: CDNFetchOptions): Promise<Response>
  purgeByTag?(tags: string[]): Promise<void>
  purgeByUrl?(urls: string[]): Promise<void>
  getEdgeCacheStatus?(url: string): Promise<CloudflareCacheStatus>
}
