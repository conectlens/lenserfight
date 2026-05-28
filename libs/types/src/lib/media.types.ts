// ─── Media & Storage Types ────────────────────────────────────────────────────
// Canonical types for the media.objects and media.attachments tables.
// Replaces the legacy PromptResource / VersionResource types from resources.types.

/**
 * Unified media type — TEXT in DB, not an enum, to avoid future migrations.
 * mime_type is the ground truth for provider capability validation.
 */
export type UnifiedMediaType =
  | 'text'
  | 'image'
  | 'audio'
  | 'video'
  | 'document'
  | 'json'
  | 'binary'

export type MediaVisibility = 'public' | 'private' | 'unlisted'
export type MediaLifecycleState = 'pending' | 'active' | 'archived' | 'deleted'

/** Mirrors media.objects */
export interface MediaObject {
  id: string
  workspaceId: string
  ownerLenserId: string
  bucket: string | null
  objectKey: string | null
  contentText: string | null
  externalUrl: string | null
  mimeType: string | null
  mediaType: UnifiedMediaType
  name: string
  byteSize: number | null
  checksumSha256: string | null
  visibility: MediaVisibility
  lifecycleState: MediaLifecycleState
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/** Mirrors media.attachments (junction table) */
export interface MediaAttachment {
  id: string
  objectId: string
  entityType: string
  entityId: string
  /** Named slot — e.g. 'context_doc', 'reference_image'. Matches prompt template placeholder. */
  bindingKey: string
  attachedBy: string | null
  attachedAt: string
  /** Hydrated at read time */
  object?: MediaObject
}

/** DTO for creating a new media object */
export interface CreateMediaObjectDTO {
  mediaType: UnifiedMediaType
  mimeType?: string
  name: string
  /** Inline text content (for mediaType 'text' or 'json'). Avoids storage round-trips. */
  contentText?: string
  /** External URL reference (for publicly accessible resources). */
  externalUrl?: string
}

/** Returned after create; used to drive browser → storage direct upload. */
export interface UploadSession {
  objectId: string
  signedUploadUrl: string
  bucket: string
  objectKey: string
}
