import { mediaRepository, FILE_PARAM_CLIPBOARD_PLACEHOLDER } from '@lenserfight/data/repositories'
import type { MediaDeliveryPurpose } from '@lenserfight/data/repositories'
import {
  isPublicHttpUrl,
  MAX_CONTENT_PARTS_PER_MESSAGE,
  normalizeFilesParamIds,
} from '@lenserfight/domain/lens-parameters'
import type { ContentPart } from '@lenserfight/providers'
import type { LensVersionParam } from '@lenserfight/types'
import { isValidUUID } from '@lenserfight/utils/validation'

function mimeFromParam(param: LensVersionParam, objectMime: string | null): string {
  const allowed = param.tool.validationSchema?.allowedMimeTypes
  if (allowed?.length) return allowed[0]
  return objectMime ?? 'application/octet-stream'
}

function toContentPart(url: string, mimeType: string, label: string, index?: number): ContentPart {
  const name = index !== undefined ? `${label}-${index + 1}` : label
  if (mimeType.startsWith('image/')) {
    return { type: 'image', url, mimeType }
  }
  if (mimeType.startsWith('audio/')) {
    return { type: 'audio', url, mimeType }
  }
  return { type: 'document', url, mimeType, name }
}

function normalizeFileParamIds(raw: unknown): string[] {
  if (typeof raw === 'string' && isValidUUID(raw)) return [raw]
  return normalizeFilesParamIds(raw)
}

async function resolveOneMediaId(
  objectId: string,
  param: LensVersionParam,
  purpose: MediaDeliveryPurpose,
): Promise<{ promptValue: string; part: ContentPart | null }> {
  const obj = await mediaRepository.getById(objectId)
  const delivered = await mediaRepository.getDeliveredMediaValue(objectId, purpose)
  if (!delivered) {
    return { promptValue: '', part: null }
  }

  const mimeType = mimeFromParam(param, obj?.mimeType ?? null)

  if (purpose === 'clipboard_external') {
    if (isPublicHttpUrl(delivered)) {
      return { promptValue: delivered, part: null }
    }
    return { promptValue: '', part: null }
  }

  const includePart =
    purpose === 'provider_browser' ||
    purpose === 'in_app_preview' ||
    delivered.startsWith('http') ||
    delivered.startsWith('data:')

  return {
    promptValue: delivered,
    part: includePart ? toContentPart(delivered, mimeType, param.label) : null,
  }
}

async function resolveFilesParam(
  ids: string[],
  param: LensVersionParam,
  purpose: MediaDeliveryPurpose,
  fileParts: ContentPart[],
): Promise<string> {
  if (ids.length === 0) {
    return purpose === 'clipboard_external' ? JSON.stringify([]) : '[]'
  }

  const promptValues: string[] = []

  for (let i = 0; i < ids.length; i++) {
    if (fileParts.length >= MAX_CONTENT_PARTS_PER_MESSAGE - 1) break

    const { promptValue, part } = await resolveOneMediaId(ids[i]!, param, purpose)
    if (purpose === 'clipboard_external') {
      if (promptValue && isPublicHttpUrl(promptValue)) {
        promptValues.push(promptValue)
      }
    } else if (promptValue) {
      promptValues.push(promptValue)
      if (part && 'url' in part) {
        fileParts.push(
          toContentPart(part.url, part.mimeType ?? 'application/octet-stream', param.label, i),
        )
      }
    }
  }

  if (purpose === 'clipboard_external') {
    if (promptValues.length === 0) {
      return FILE_PARAM_CLIPBOARD_PLACEHOLDER
    }
    return JSON.stringify(promptValues)
  }

  return JSON.stringify(promptValues.length > 0 ? promptValues : ids)
}

/**
 * Resolves file/files-param media_object_id values for prompt text and multimodal messages.
 */
export async function resolveLensFileParamsForExecution(
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[],
  purpose: MediaDeliveryPurpose = 'in_app_preview',
): Promise<{ snapshotForPrompt: Record<string, unknown>; fileParts: ContentPart[] }> {
  const snapshotForPrompt = { ...snapshot }
  const fileParts: ContentPart[] = []

  for (const param of versionParams) {
    const type = param.tool.type
    if (type !== 'file' && type !== 'files') continue

    const raw = snapshot[param.label]

    if (type === 'file') {
      const ids = normalizeFileParamIds(raw)
      if (ids.length === 0) continue
      const id = ids[0]!
      const { promptValue, part } = await resolveOneMediaId(id, param, purpose)
      if (!promptValue && purpose !== 'clipboard_external') continue
      snapshotForPrompt[param.label] =
        purpose === 'clipboard_external' && !isPublicHttpUrl(promptValue)
          ? FILE_PARAM_CLIPBOARD_PLACEHOLDER
          : promptValue || FILE_PARAM_CLIPBOARD_PLACEHOLDER
      if (part && fileParts.length < MAX_CONTENT_PARTS_PER_MESSAGE - 1) {
        fileParts.push(part)
      }
      continue
    }

    const ids = normalizeFilesParamIds(raw)
    snapshotForPrompt[param.label] = await resolveFilesParam(ids, param, purpose, fileParts)
  }

  return { snapshotForPrompt, fileParts }
}

/**
 * Resolves file params for clipboard / external AI tools.
 */
export async function resolveLensFileParamsForCopy(
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[],
): Promise<Record<string, unknown>> {
  const { snapshotForPrompt } = await resolveLensFileParamsForExecution(
    snapshot,
    versionParams,
    'clipboard_external',
  )
  return snapshotForPrompt
}

/** Maps file/files params to execution attachment_bindings (server-side runs). */
export function buildFileAttachmentBindings(
  snapshot: Record<string, unknown>,
  versionParams: LensVersionParam[],
): { media_object_id: string; binding_key: string }[] {
  const bindings: { media_object_id: string; binding_key: string }[] = []
  for (const param of versionParams) {
    if (param.tool.type !== 'file' && param.tool.type !== 'files') continue
    const ids = normalizeFileParamIds(snapshot[param.label])
    for (const media_object_id of ids) {
      bindings.push({ media_object_id, binding_key: param.label })
    }
  }
  return bindings
}
