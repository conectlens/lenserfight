import type { StorageAdapterPort, StorageListItem } from './storage.types'
import { readR2Config, r2Endpoint, type R2Config } from './r2-config'

type S3Module = typeof import('@aws-sdk/client-s3')
type PresignerModule = typeof import('@aws-sdk/s3-request-presigner')

let s3Modules: { s3: S3Module; presigner: PresignerModule } | null = null

async function loadS3(): Promise<{ s3: S3Module; presigner: PresignerModule }> {
  if (!s3Modules) {
    const [s3, presigner] = await Promise.all([
      import('@aws-sdk/client-s3'),
      import('@aws-sdk/s3-request-presigner'),
    ])
    s3Modules = { s3, presigner }
  }
  return s3Modules
}

function resolveBucket(config: R2Config, bucket: string): string {
  return bucket === config.bucket ? config.bucket : bucket
}

export class CloudflareR2StorageAdapter implements StorageAdapterPort {
  private config: R2Config

  constructor(config?: R2Config | null) {
    const resolved = config ?? readR2Config()
    if (!resolved) {
      throw new Error(
        'Cloudflare R2 adapter requires R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.',
      )
    }
    this.config = resolved
  }

  private async getClient() {
    const { s3 } = await loadS3()
    return new s3.S3Client({
      region: 'auto',
      endpoint: r2Endpoint(this.config.accountId),
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    })
  }

  async createSignedUploadUrl(
    bucket: string,
    objectKey: string,
  ): Promise<{ signedUrl: string; token: string }> {
    const { s3, presigner } = await loadS3()
    const client = await this.getClient()
    const b = resolveBucket(this.config, bucket)
    const command = new s3.PutObjectCommand({ Bucket: b, Key: objectKey })
    const signedUrl = await presigner.getSignedUrl(client, command, { expiresIn: 3600 })
    return { signedUrl, token: objectKey }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const { s3 } = await loadS3()
    const client = await this.getClient()
    await client.send(
      new s3.DeleteObjectCommand({
        Bucket: resolveBucket(this.config, bucket),
        Key: objectKey,
      }),
    )
  }

  getPublicUrl(bucket: string, objectKey: string): string {
    if (!this.config.publicBaseUrl) {
      throw new Error('R2_PUBLIC_URL is required for getPublicUrl')
    }
    const b = resolveBucket(this.config, bucket)
    const prefix = this.config.publicBaseUrl.includes(b)
      ? this.config.publicBaseUrl
      : `${this.config.publicBaseUrl}/${b}`
    return `${prefix.replace(/\/$/, '')}/${objectKey}`
  }

  async getSignedDownloadUrl(
    bucket: string,
    objectKey: string,
    expiresIn = 3600,
  ): Promise<string> {
    if (this.config.publicBaseUrl) {
      return this.getPublicUrl(bucket, objectKey)
    }

    const { s3, presigner } = await loadS3()
    const client = await this.getClient()
    const command = new s3.GetObjectCommand({
      Bucket: resolveBucket(this.config, bucket),
      Key: objectKey,
    })
    return presigner.getSignedUrl(client, command, { expiresIn })
  }

  async listObjects(
    bucket: string,
    prefix: string,
    limit = 100,
  ): Promise<StorageListItem[]> {
    const { s3 } = await loadS3()
    const client = await this.getClient()
    const out = await client.send(
      new s3.ListObjectsV2Command({
        Bucket: resolveBucket(this.config, bucket),
        Prefix: prefix,
        MaxKeys: limit,
      }),
    )

    return (out.Contents ?? []).map((item) => ({
      name: item.Key ?? '',
      id: item.ETag ?? null,
      size: item.Size ?? 0,
      createdAt: item.LastModified?.toISOString() ?? '',
    }))
  }
}
