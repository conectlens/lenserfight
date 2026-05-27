export type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  /** Default bucket when StorageAdapterPort bucket arg is the logical name. */
  bucket: string
  /** Public CDN base URL (no trailing slash), e.g. https://media.example.com */
  publicBaseUrl: string
}

import { readEnv } from '@lenserfight/utils/env'

export function readR2Config(): R2Config | null {
  const accountId = readEnv('R2_ACCOUNT_ID')
  const accessKeyId = readEnv('R2_ACCESS_KEY_ID')
  const secretAccessKey = readEnv('R2_SECRET_ACCESS_KEY')
  const bucket = readEnv('R2_BUCKET') || readEnv('R2_BUCKET_NAME')
  const publicBaseUrl = readEnv('R2_PUBLIC_URL').replace(/\/$/, '')

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    return null
  }

  return { accountId, accessKeyId, secretAccessKey, bucket, publicBaseUrl }
}

export function r2Endpoint(accountId: string): string {
  return `https://${accountId}.r2.cloudflarestorage.com`
}
