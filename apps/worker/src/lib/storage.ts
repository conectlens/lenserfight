import type { SupabaseClient } from '@supabase/supabase-js'

// Phase AK — server-side storage helper.
//
// Workers (sync-image, sync-audio, async-poll) use this module to upload
// generated media into the `generated-media` bucket and to mint signed URLs
// for the media-proxy route. RLS still applies on storage.objects, but since
// we always go through the service-role client here, the bucket-level policy
// is bypassed — uploads are gated by the worker's own auth checks.

const GENERATED_MEDIA_BUCKET = 'generated-media'

export interface UploadResult {
  bucket: string
  objectKey: string
  byteSize: number
  mimeType: string
}

export interface UploadInput {
  /** execution.runs.id — used to derive a deterministic object key. */
  runId: string
  /** Logical kind that disambiguates multiple outputs of one run. */
  outputKind: 'image' | 'video' | 'audio' | 'music'
  /** Bytes to upload. */
  body: Buffer
  /** Full MIME type, e.g. `image/png`. */
  mimeType: string
  /**
   * Optional file extension override. When omitted we derive from MIME
   * (`image/png` → `png`). The bucket's `allowed_mime_types` policy is the
   * authoritative gate; this is a UX hint for clients that download.
   */
  ext?: string
}

function deriveExt(mimeType: string, override?: string): string {
  if (override) return override.replace(/^\./, '')
  const tail = mimeType.split('/')[1] ?? 'bin'
  // Common normalizations — Supabase storage will accept any string but
  // human-readable extensions help the CLI download path.
  if (tail === 'jpeg') return 'jpg'
  if (tail === 'mpeg') return 'mp3'
  if (tail === 'quicktime') return 'mov'
  return tail
}

export function deriveObjectKey(runId: string, kind: UploadInput['outputKind'], ext: string): string {
  // Mirror fn_complete_async_run's `async/<run_id>.<ext>` shape so async and
  // sync uploads share one naming convention.
  return `${kind === 'image' || kind === 'video' || kind === 'audio' ? 'sync' : 'sync'}/${runId}.${ext}`
}

export async function uploadToGeneratedMedia(
  client: SupabaseClient,
  input: UploadInput,
): Promise<UploadResult> {
  const ext = deriveExt(input.mimeType, input.ext)
  const objectKey = deriveObjectKey(input.runId, input.outputKind, ext)

  const { error } = await client.storage
    .from(GENERATED_MEDIA_BUCKET)
    .upload(objectKey, input.body, {
      contentType: input.mimeType,
      upsert: false,
    })

  if (error) {
    // Re-throw with provider context so callers can map to a billing-failed
    // run state via fn_complete_async_run / fn_media_finalize_sync_upload.
    throw new Error(`storage_upload_failed: ${error.message}`)
  }

  return {
    bucket: GENERATED_MEDIA_BUCKET,
    objectKey,
    byteSize: input.body.length,
    mimeType: input.mimeType,
  }
}

export interface SignedUrlOptions {
  /** Seconds until expiry. Default 3600 (1 hour). */
  expiresIn?: number
  /** Force `Content-Disposition: attachment` for `lf media download` flows. */
  download?: boolean | string
}

export async function createGeneratedMediaSignedUrl(
  client: SupabaseClient,
  objectKey: string,
  options: SignedUrlOptions = {},
): Promise<string> {
  const expiresIn = options.expiresIn ?? 3600
  const { data, error } = await client.storage
    .from(GENERATED_MEDIA_BUCKET)
    .createSignedUrl(objectKey, expiresIn, {
      download: options.download,
    })
  if (error || !data?.signedUrl) {
    throw new Error(`signed_url_failed: ${error?.message ?? 'unknown'}`)
  }
  return data.signedUrl
}

export const GeneratedMedia = {
  bucket: GENERATED_MEDIA_BUCKET,
}
