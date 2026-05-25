export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  /** Default bucket when StorageAdapterPort bucket arg is the logical name. */
  bucket: string
  /** Public CDN base URL (no trailing slash), e.g. https://media.example.com */
  publicBaseUrl: string
}

function read(key: string): string {
  if (typeof process !== 'undefined' && process.env?.[key]) {
    return String(process.env[key]).trim()
  }
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const v = import.meta.env[key] as string | undefined
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export function readR2Config(): R2Config | null {
  const accountId = read('R2_ACCOUNT_ID')
  const accessKeyId = read('R2_ACCESS_KEY_ID')
  const secretAccessKey = read('R2_SECRET_ACCESS_KEY')
  const bucket = read('R2_BUCKET') || read('R2_BUCKET_NAME')
  const publicBaseUrl = read('R2_PUBLIC_URL').replace(/\/$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl }
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`
}
