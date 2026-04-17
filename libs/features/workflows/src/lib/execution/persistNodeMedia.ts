import { mediaService } from '@lenserfight/data/repositories'
import { getStorageAdapter } from '@lenserfight/infra/storage'

import type { CreateMediaObjectDTO, MediaObject, NodeOutputEnvelope } from '@lenserfight/types'

/**
 * Browser-side helper that persists a node's produced media artifact (blob URL)
 * into `media.objects` storage so the workflow run survives a page refresh.
 *
 * Rationale:
 *   • Providers such as `PdfExportProvider` return an in-memory `blob:` URL so
 *     the UI can preview the artifact immediately, but the URL does not survive
 *     a page refresh.
 *   • We upload the blob bytes to Supabase Storage and create a `media.objects`
 *     row; callers stamp the resulting `media.objects.id` onto the node output
 *     envelope (`envelope.media.url` rewritten to a signed URL, and
 *     `workflow_node_results.output_data.media.objectId`) so the downstream
 *     realtime consumer can fetch it.
 *   • Server-side / CF Worker artifact persistence (single-lens runs) uses the
 *     `execution.fn_persist_execution_artifacts` + `execution.artifact_medias`
 *     path which is *not* involved here; workflow node results and execution
 *     artifacts are distinct.
 *
 * This helper is intentionally scoped to the browser because blob URLs are
 * only resolvable in the process that created them.
 *
 * @param envelope        The node output envelope with media info (kind, url, mime).
 * @param runId           workflow_runs.id used to scope the storage path.
 * @param nodeId          workflow_nodes.id used to name the storage key.
 * @param workspaceId     Active workspace id (required by media.objects RLS).
 * @param bucket          Storage bucket, defaults to 'workflow-artifacts'.
 */
export async function persistNodeMediaArtifact(args: {
  envelope: NodeOutputEnvelope
  runId: string
  nodeId: string
  workspaceId: string
  bucket?: string
}): Promise<MediaObject | null> {
  const { envelope, runId, nodeId, workspaceId, bucket = 'workflow-artifacts' } = args

  const media = envelope.media
  if (!media?.url) return null
  if (!media.url.startsWith('blob:') && !media.url.startsWith('data:')) return null

  // Resolve the blob. Blob URLs and data URLs both resolve via fetch() in the
  // browser — same code path for both.
  const blob = await fetch(media.url).then((res) => res.blob())

  const mimeType = media.mime ?? blob.type ?? 'application/octet-stream'
  const mediaType = pickMediaType(envelope.artifactKind, mimeType)
  const extension = pickExtension(mimeType) ?? 'bin'
  const objectKey = `runs/${runId}/${nodeId}.${extension}`

  const dto: CreateMediaObjectDTO = {
    mediaType,
    mimeType,
    name: `node-${nodeId}.${extension}`,
  }

  const session = await mediaService.startUpload(dto, workspaceId, bucket, objectKey)

  const adapter = getStorageAdapter()
  const { signedUrl } = await adapter.createSignedUploadUrl(bucket, objectKey)

  const uploadResponse = await fetch(signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: blob,
  })
  if (!uploadResponse.ok) {
    throw new Error(`Storage upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
  }

  await mediaService.finalizeUpload(session.objectId, bucket, objectKey, blob.size)

  return mediaService.getById(session.objectId)
}

type MediaKind = CreateMediaObjectDTO['mediaType']

function pickMediaType(artifactKind: NodeOutputEnvelope['artifactKind'], mime: string): MediaKind {
  if (artifactKind === 'image' || mime.startsWith('image/')) return 'image'
  if (artifactKind === 'video' || mime.startsWith('video/')) return 'video'
  if (artifactKind === 'audio' || mime.startsWith('audio/')) return 'audio'
  if (artifactKind === 'pdf' || mime === 'application/pdf') return 'document'
  return 'binary'
}

function pickExtension(mime: string): string | null {
  switch (mime) {
    case 'application/pdf': return 'pdf'
    case 'image/png': return 'png'
    case 'image/jpeg': return 'jpg'
    case 'image/webp': return 'webp'
    case 'image/gif': return 'gif'
    case 'video/mp4': return 'mp4'
    case 'video/webm': return 'webm'
    case 'audio/mpeg': return 'mp3'
    case 'audio/wav': return 'wav'
    default: return null
  }
}
