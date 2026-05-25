/** Who consumes the resolved media URL or bytes. */
export type MediaDeliveryPurpose =
  | 'clipboard_external'
  | 'provider_browser'
  | 'provider_server'
  | 'in_app_preview'

export type MediaDeliveryResult =
  | { kind: 'url'; url: string }
  | { kind: 'placeholder'; text: string }
  | { kind: 'inline_data_uri'; dataUri: string; mimeType: string }

export const FILE_PARAM_CLIPBOARD_PLACEHOLDER =
  '(file attached in LenserFight — upload manually to your AI tool, or set SUPABASE_PUBLIC_URL for a shareable link)'

/** Default max bytes for inlining images in provider_browser / optional copy. */
export const DEFAULT_MEDIA_INLINE_MAX_BYTES = 8 * 1024 * 1024
