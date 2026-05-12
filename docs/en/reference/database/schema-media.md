# Schema: media

The `media` schema provides a normalized file/media registry, replacing `ai.resources`. It tracks uploaded objects through their full lifecycle, binds them to arbitrary entities via attachments, and integrates with Supabase Storage for the actual file bytes.

## Tables

### objects

Central registry of all uploaded media objects.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `workspace_id` | uuid NOT NULL | FK -> `tenancy.workspaces(id)` |
| `owner_lenser_id` | uuid NOT NULL | FK -> `lensers.profiles(id)`. Uploader. |
| `bucket` | text | Supabase Storage bucket name. NULL for inline/external. |
| `object_key` | text | Storage object path within the bucket |
| `content_text` | text | Inline text content (avoids storage round-trips) |
| `external_url` | text | External URL reference |
| `mime_type` | text | IANA MIME type (e.g., `image/png`, `application/pdf`) |
| `media_type` | text NOT NULL | `text`, `image`, `audio`, `video`, `document`, `json`, `binary` |
| `name` | text NOT NULL | Display name / filename |
| `byte_size` | bigint | File size in bytes. Set on finalize. |
| `checksum_sha256` | text | SHA-256 hash for integrity verification |
| `visibility` | text NOT NULL DEFAULT 'private' | `public`, `private`, `unlisted` |
| `lifecycle_state` | text NOT NULL DEFAULT 'pending' | `pending`, `active`, `archived`, `deleted` |
| `metadata` | jsonb DEFAULT '{}' | Extensible metadata (dimensions, duration, etc.) |
| `created_by` | uuid | FK -> `lensers.profiles(id)` |
| `created_at` | timestamptz NOT NULL DEFAULT now() | |
| `updated_at` | timestamptz NOT NULL DEFAULT now() | Auto-updated via trigger |

**Unique constraint:** `(bucket, object_key)` — partial, only when `bucket IS NOT NULL`

**One-payload constraint:** Exactly one of these must be set:
- `bucket` + `object_key` (storage-backed file)
- `content_text` (inline text content)
- `external_url` (external URL reference)
- All NULL (pending object, not yet uploaded)

### attachments

Binds media objects to business entities via named slots.

| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid (PK) | |
| `object_id` | uuid NOT NULL | FK -> `media.objects(id)` CASCADE |
| `entity_type` | text NOT NULL | e.g., `lens_version`, `thread`, `profile` |
| `entity_id` | uuid NOT NULL | ID of the entity |
| `binding_key` | text DEFAULT '_default' | Named slot (e.g., `context_doc`, `reference_image`) |
| `attached_by` | uuid | FK -> `lensers.profiles(id)` |
| `attached_at` | timestamptz DEFAULT now() | |

**Unique constraint:** `(entity_type, entity_id, binding_key)` — one object per slot per entity

## Upload lifecycle

```
1. CREATE media.objects row (lifecycle_state = 'pending')
2. GET signed upload URL via storage adapter
3. Browser PUTs file directly to Supabase Storage
4. FINALIZE via fn_media_finalize_upload (sets bucket, object_key, lifecycle_state = 'active')
5. BIND via fn_media_bind_attachment (links object to entity with binding_key)
```

## RPC functions

| Function | Purpose |
|----------|---------|
| `fn_media_finalize_upload(object_id, bucket, object_key, byte_size?, checksum?)` | Finalizes upload, sets lifecycle_state to active |
| `fn_media_bind_attachment(object_id, entity_type, entity_id, binding_key?)` | Upserts attachment binding |
| `fn_media_unbind_attachment(entity_type, entity_id, binding_key?)` | Removes attachment binding |
| `fn_media_soft_delete(object_id)` | Sets lifecycle_state to deleted |

All RPCs are `SECURITY DEFINER` and validate ownership.

## RLS summary

**objects:** Owner, workspace members, or public visibility determines read access. Only owner can write/update.

**attachments:** Access controlled through the referenced object's visibility and ownership.

## Storage buckets

| Bucket | Public | Max Size | Purpose |
|--------|--------|----------|---------|
| `lens-resources` | No | 50 MB | Lens version attachments |
| `user-media` | No | 20 MB | User-uploaded media |
| `artifacts` | No | 100 MB | Execution output artifacts |
| `public-assets` | Yes | 10 MB | Public thumbnails, previews |
