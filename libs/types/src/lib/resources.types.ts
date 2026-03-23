// ─── Resource Registry Types ──────────────────────────────────────────────────
// @deprecated — Use MediaObject, MediaAttachment, UploadSession from media.types instead.
// This file is retained for backward compatibility during the migration.
// Mirrors ai.resources and lenses.version_resources (legacy tables).

/**
 * @deprecated Use UnifiedMediaType from media.types instead.
 * Extensible media type — TEXT in DB, not an enum, to avoid future migrations.
 * mime_type is the ground truth for provider capability validation.
 */
export type MediaType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'json'
  | 'binary'

/** @deprecated Use MediaObject from media.types. Mirrors ai.resources (legacy). */
export interface PromptResource {
  id: string
  ownerLenserId: string
  mediaType: MediaType
  mimeType?: string | null
  name: string
  storageBucket?: string | null
  objectKey?: string | null
  contentText?: string | null
  url?: string | null
  byteSize?: number | null
  metadata?: Record<string, unknown> | null
  isPublic: boolean
  createdAt: string
}

/** @deprecated Use MediaAttachment from media.types. Mirrors lenses.version_resources (legacy). */
export interface VersionResource {
  versionId: string
  resourceId: string
  /** Named slot — e.g. 'context_doc', 'reference_image'. Matches prompt template placeholder. */
  bindingKey: string
  // Hydrated at read time
  resource?: PromptResource
}

/** @deprecated Use CreateMediaObjectDTO from media.types */
export interface CreateResourceDTO {
  mediaType: MediaType
  mimeType?: string
  name: string
  /** Inline text content (for mediaType 'text' or 'json'). Avoids storage round-trips. */
  contentText?: string
  /** External URL reference (for mediaType 'url' or publicly accessible resources). */
  url?: string
}

/** @deprecated Use UploadSession from media.types */
export interface ResourceUploadSession {
  resourceId: string
  signedUploadUrl: string
  bucket: string
  objectKey: string
}
