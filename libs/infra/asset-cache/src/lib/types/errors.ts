export class AssetIntegrityError extends Error {
  readonly assetId: string
  readonly url: string
  readonly expected: string
  readonly actual: string

  constructor(assetId: string, url: string, expected: string, actual: string) {
    super(`SRI mismatch for ${assetId} (${url})`)
    this.name = 'AssetIntegrityError'
    this.assetId = assetId
    this.url = url
    this.expected = expected
    this.actual = actual
  }
}

export class AssetCacheError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AssetCacheError'
    this.code = code
  }
}
