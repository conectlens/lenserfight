import type { MediaObject } from '@lenserfight/types'
import {
  buildMediaContentProxyUrl,
  getMediaInlineMaxBytes,
  getSupabasePublicUrl,
  isMediaContentProxyEnabled,
} from './config'
import { fetchAsDataUriIfSmall } from './inlineBytes'
import {
  FILE_PARAM_CLIPBOARD_PLACEHOLDER,
  type MediaDeliveryPurpose,
  type MediaDeliveryResult,
} from './types'
import { isLoopbackOrLocalUrl, rewriteUrlOrigin } from './urlUtils'

export type DeliverMediaInput = {
  object: MediaObject
  signedUrl: string | null
  purpose: MediaDeliveryPurpose
  mimeType: string
  /** Required for clipboard_external proxy URLs. */
  createAccessToken?: (objectId: string) => Promise<string | null>
}

/**
 * Resolves how a media object should be exposed for a given consumer purpose.
 */
export async function deliverMedia(input: DeliverMediaInput): Promise<MediaDeliveryResult> {
  const { object, signedUrl, purpose, mimeType, createAccessToken } = input

  if (object.externalUrl) {
    return { kind: 'url', url: object.externalUrl }
  }

  if (!signedUrl) {
    return { kind: 'placeholder', text: FILE_PARAM_CLIPBOARD_PLACEHOLDER }
  }

  const publicBase = getSupabasePublicUrl()

  switch (purpose) {
    case 'in_app_preview':
      return { kind: 'url', url: maybeRewrite(signedUrl, publicBase) }

    case 'clipboard_external':
      return deliverForClipboard(signedUrl, object.id, publicBase, createAccessToken)

    case 'provider_browser':
      return deliverForProviderBrowser(signedUrl, mimeType, publicBase)

    case 'provider_server':
      return deliverForProviderServer(signedUrl, object.id, publicBase, createAccessToken)

    default:
      return { kind: 'url', url: signedUrl }
  }
}

function maybeRewrite(signedUrl: string, publicBase: string): string {
  if (!publicBase || !isLoopbackOrLocalUrl(signedUrl)) return signedUrl
  return rewriteUrlOrigin(signedUrl, publicBase)
}

async function deliverForClipboard(
  signedUrl: string,
  objectId: string,
  publicBase: string,
  createAccessToken?: (objectId: string) => Promise<string | null>,
): Promise<MediaDeliveryResult> {
  if (publicBase && isLoopbackOrLocalUrl(signedUrl)) {
    return { kind: 'url', url: rewriteUrlOrigin(signedUrl, publicBase) }
  }

  if (!isLoopbackOrLocalUrl(signedUrl)) {
    return { kind: 'url', url: signedUrl }
  }

  if (isMediaContentProxyEnabled() && createAccessToken) {
    const token = await createAccessToken(objectId)
    if (token) {
      return { kind: 'url', url: buildMediaContentProxyUrl(objectId, token) }
    }
  }

  return { kind: 'placeholder', text: FILE_PARAM_CLIPBOARD_PLACEHOLDER }
}

async function deliverForProviderBrowser(
  signedUrl: string,
  mimeType: string,
  publicBase: string,
): Promise<MediaDeliveryResult> {
  const fetchUrl = maybeRewrite(signedUrl, publicBase)
  const dataUri = await fetchAsDataUriIfSmall(fetchUrl, mimeType, getMediaInlineMaxBytes())
  if (dataUri) {
    return { kind: 'inline_data_uri', dataUri, mimeType }
  }

  if (!isLoopbackOrLocalUrl(fetchUrl)) {
    return { kind: 'url', url: fetchUrl }
  }

  return {
    kind: 'placeholder',
    text: `[Attachment: ${mimeType} — could not inline for provider; file is only on local storage]`,
  }
}

async function deliverForProviderServer(
  signedUrl: string,
  objectId: string,
  publicBase: string,
  createAccessToken?: (objectId: string) => Promise<string | null>,
): Promise<MediaDeliveryResult> {
  if (publicBase && isLoopbackOrLocalUrl(signedUrl)) {
    return { kind: 'url', url: rewriteUrlOrigin(signedUrl, publicBase) }
  }

  if (!isLoopbackOrLocalUrl(signedUrl)) {
    return { kind: 'url', url: signedUrl }
  }

  if (isMediaContentProxyEnabled() && createAccessToken) {
    const token = await createAccessToken(objectId)
    if (token) {
      return { kind: 'url', url: buildMediaContentProxyUrl(objectId, token) }
    }
  }

  return { kind: 'placeholder', text: FILE_PARAM_CLIPBOARD_PLACEHOLDER }
}

/** Maps delivery result to a string for prompt template substitution. */
export function deliveryResultToPromptValue(result: MediaDeliveryResult): string {
  switch (result.kind) {
    case 'url':
      return result.url
    case 'inline_data_uri':
      return result.dataUri
    case 'placeholder':
      return result.text
  }
}

/** Maps delivery result to ContentPart URL field. */
export function deliveryResultToContentUrl(result: MediaDeliveryResult): string | null {
  switch (result.kind) {
    case 'url':
    case 'inline_data_uri':
      return result.kind === 'inline_data_uri' ? result.dataUri : result.url
    case 'placeholder':
      return null
  }
}
