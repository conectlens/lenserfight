// ─── Resource Registry Types ──────────────────────────────────────────────────
// Mirrors content.resources and content.version_resources.
// Resources are first-class objects: documents, images, text blobs, URLs.

/**
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

/** Mirrors content.resources */
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

/** Mirrors content.version_resources (junction table) */
export interface VersionResource {
  versionId: string
  resourceId: string
  /** Named slot — e.g. 'context_doc', 'reference_image'. Matches prompt template placeholder. */
  bindingKey: string
  // Hydrated at read time
  resource?: PromptResource
}

export interface CreateResourceDTO {
  mediaType: MediaType
  mimeType?: string
  name: string
  /** Inline text content (for mediaType 'text' or 'json'). Avoids storage round-trips. */
  contentText?: string
  /** External URL reference (for mediaType 'url' or publicly accessible resources). */
  url?: string
}

/** Returned after create; used to drive browser → Supabase Storage direct upload. */
export interface ResourceUploadSession {
  resourceId: string
  signedUploadUrl: string
  bucket: string
  objectKey: string
}
