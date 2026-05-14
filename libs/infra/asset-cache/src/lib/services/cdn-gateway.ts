import type { CDNFetchOptions, ICDNProvider } from '../interfaces/cdn'
import { AssetCacheError } from '../types/errors'

export interface CDNGatewayOptions {
  fetchImpl?: typeof fetch
  defaultHeaders?: Record<string, string>
}

export class CloudflareCDNProvider implements ICDNProvider {
  private readonly fetchImpl: typeof fetch
  private readonly defaultHeaders: Record<string, string>

  constructor(options: CDNGatewayOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis)
    this.defaultHeaders = options.defaultHeaders ?? {}
  }

  async fetch(url: string, options: CDNFetchOptions = {}): Promise<Response> {
    const headers = new Headers(this.defaultHeaders)
    if (options.etag) headers.set('If-None-Match', options.etag)
    if (options.cacheTags && options.cacheTags.length > 0) {
      headers.set('Cache-Tag', options.cacheTags.join(','))
    }

    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers,
      signal: options.signal,
      credentials: 'omit',
      mode: 'cors',
    })

    if (response.status === 304) return response
    if (!response.ok) {
      throw new AssetCacheError('cdn-fetch-failed', `CDN responded with ${response.status} for ${url}`)
    }

    if (options.expectedMimeType) {
      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes(options.expectedMimeType)) {
        throw new AssetCacheError(
          'mime-mismatch',
          `Expected ${options.expectedMimeType} but received ${contentType}`,
        )
      }
    }

    if (options.maxResponseBytes) {
      const lengthHeader = response.headers.get('content-length')
      if (lengthHeader) {
        const length = Number.parseInt(lengthHeader, 10)
        if (Number.isFinite(length) && length > options.maxResponseBytes) {
          throw new AssetCacheError('response-too-large', `Response of ${length} bytes exceeds limit`)
        }
      }
    }

    return response
  }
}

export class MockCDNProvider implements ICDNProvider {
  private readonly responses = new Map<string, Response>()

  setResponse(url: string, response: Response): void {
    this.responses.set(url, response)
  }

  async fetch(url: string): Promise<Response> {
    const res = this.responses.get(url)
    if (!res) throw new AssetCacheError('not-found', `MockCDNProvider has no response for ${url}`)
    return res.clone()
  }
}
