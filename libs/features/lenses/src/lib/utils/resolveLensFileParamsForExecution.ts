import { mediaRepository } from '@lenserfight/data/repositories'
import type { ContentPart } from '@lenserfight/providers'
import type { LensVersionParam } from '@lenserfight/types'
import { isValidUUID } from '@lenserfight/utils/validation'

function mimeFromParam(param: LensVersionParam, objectMime: string | null): string {
  const allowed = param.tool.validationSchema?.allowedMimeTypes
  if (allowed?.length) return allowed[0]
  return objectMime ?? 'application/octet-stream'
}

function toContentPart(url: string, mimeType: string, label: string): ContentPart {
  if (mimeType.startsWith('image/')) {
    return { type: 'image', url, mimeType }
  }
  if (mimeType.startsWith('audio/')) {
    return { type: 'audio', url, mimeType }
  }
  return { type: 'document', url, mimeType, name: label }
}

/**
 * Resolves file-param media_object_id values to signed read URLs for prompt text
 * and multimodal provider messages.
 */
export async function resolveLensFileParamsForExecution(
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[]
): Promise<{ snapshotForPrompt: Record<string, unknown>; fileParts: ContentPart[] }> {
  const snapshotForPrompt = { ...snapshot }
  const fileParts: ContentPart[] = []

  for (const param of versionParams) {
    if (param.tool.type !== 'file') continue
    const raw = snapshot[param.label]
    if (typeof raw !== 'string' || !isValidUUID(raw)) continue

    const obj = await mediaRepository.getById(raw)
    const url = await mediaRepository.getSignedReadUrl(raw)
    if (!url) continue

    const mimeType = mimeFromParam(param, obj?.mimeType ?? null)
    snapshotForPrompt[param.label] = url
    fileParts.push(toContentPart(url, mimeType, param.label))
  }

  return { snapshotForPrompt, fileParts }
}

/** Maps file-type params to execution attachment_bindings (server-side runs). */
export function buildFileAttachmentBindings(
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[]
): { media_object_id: string; binding_key: string }[] {
  const bindings: { media_object_id: string; binding_key: string }[] = []
  for (const param of versionParams) {
    if (param.tool.type !== 'file') continue
    const raw = snapshot[param.label]
    if (typeof raw === 'string' && isValidUUID(raw)) {
      bindings.push({ media_object_id: raw, binding_key: param.label })
    }
  }
  return bindings
}
