---
title: Storage Adapters
description: Reference for LenserFight's pluggable storage adapter system — Supabase, local file system, and Cloudflare R2 — with interface spec, adapter selection, and the ~/.lenserfight/ directory layout.
---

# Storage Adapters

LenserFight decouples file and media storage from application logic through a `StorageAdapterPort` interface. You can swap backends — Supabase Storage, local file system, or Cloudflare R2 — without changing any business code.

---

## Adapter overview

| Adapter ID | Status | Use case | Requires |
|-----------|--------|----------|---------|
| `supabase` | **Production** | Cloud deployments, multi-user, RLS-enforced media | Running Supabase instance |
| `local` | **Dev / CLI** | No-cloud local development, CLI tooling, offline use | `~/.lenserfight/` directory |
| `r2` | Stub (not implemented) | Cloudflare R2 object storage | Cloudflare account + R2 bucket |

### Selecting an adapter

Set the `VITE_DATA_SOURCE` environment variable before starting the app or CLI:

```bash
# Use local file system (no Supabase required)
VITE_DATA_SOURCE=file

# Use Supabase Storage (default)
VITE_DATA_SOURCE=supabase
```

At runtime, `storage.registry.ts` maps the env value to a concrete adapter:

```
VITE_DATA_SOURCE  →  storage.registry.ts  →  StorageAdapterPort implementation
  "file"               getStorageAdapter()     LocalFileStorageAdapter
  "supabase"           setDefaultStorageAdapter  SupabaseStorageAdapter
  (custom)                                      (register your own)
```

You can also override programmatically:

```typescript
import { setDefaultStorageAdapter } from '@lenserfight/infra/storage'
setDefaultStorageAdapter('local')
```

---

## `StorageAdapterPort` interface

All adapters implement this contract (`libs/infra/storage/src/lib/storage.types.ts`):

```typescript
interface StorageAdapterPort {
  createSignedUploadUrl(bucket: string, objectKey: string): Promise<{ signedUrl: string; token: string }>
  deleteObject(bucket: string, objectKey: string): Promise<void>
  getPublicUrl(bucket: string, objectKey: string): string
  getSignedDownloadUrl(bucket: string, objectKey: string, expiresIn?: number): Promise<string>
  listObjects(bucket: string, prefix: string, limit?: number): Promise<StorageListItem[]>
}

interface StorageListItem {
  name: string
  id: string | null
  size: number       // bytes
  createdAt: string  // ISO 8601
}

type StorageAdapterId = 'supabase' | 'local' | 'r2'
```

| Method | Description |
|--------|-------------|
| `createSignedUploadUrl` | Returns a URL the client can PUT a file to directly, without server-side streaming |
| `deleteObject` | Permanently removes a file from storage |
| `getPublicUrl` | Returns a stable public URL (only meaningful for public buckets) |
| `getSignedDownloadUrl` | Returns a time-limited URL for secure file download |
| `listObjects` | Lists objects under a prefix, up to `limit` results |

---

## Design principles (GRASP)

| Principle | Applied how |
|-----------|-------------|
| **Pure Fabrication** | `StorageRegistry` (`storage.registry.ts`) is a fabricated factory class — not a domain concept — that manages adapter lifecycle |
| **Protected Variations** | All consumers depend on `StorageAdapterPort`, not on concrete adapters; swapping backends requires zero business-code changes |
| **Low Coupling** | Adapter selection is externalised to an env var or a single `setDefaultStorageAdapter()` call |
| **Information Expert** | Each adapter encapsulates its own backend details — callers never know whether they're writing to Supabase, disk, or R2 |

---

## Media lifecycle

All adapters integrate with the `media` database schema (or its local equivalent). The flow is the same regardless of adapter:

```
1. CREATE  →  INSERT into media.objects (lifecycle_state = 'pending')
2. SIGN    →  adapter.createSignedUploadUrl(bucket, objectKey)
3. UPLOAD  →  Browser/CLI PUTs file to the signed URL
4. FINALIZE → Call fn_media_finalize_upload RPC (sets lifecycle_state = 'active')
5. ATTACH  →  Call fn_media_bind_attachment RPC (links object to entity)
```

**Inline text shortcut:** If `contentText` is set on a `media.objects` row, steps 2–4 are skipped — no file upload needed. Useful for small text artifacts.

---

## Storage buckets (Supabase adapter)

| Bucket | Public | Max size | Purpose |
|--------|--------|----------|---------|
| `lens-resources` | No | 50 MB | Lens version file attachments |
| `user-media` | No | 20 MB | User-uploaded media |
| `artifacts` | No | 100 MB | Execution output artifacts |
| `public-assets` | Yes | 10 MB | Public thumbnails and previews |

---

## `~/.lenserfight/` directory layout (local adapter)

When `VITE_DATA_SOURCE=file`, the local adapter reads and writes from the user's home directory:

```
~/.lenserfight/
├── config.json          # Auth tokens, default adapter id, global preferences
├── lenses/              # Lens metadata — one JSON file per lens
│   └── {id}.json
├── lensers/             # Lenser profile data
│   └── {handle}.json
├── media/               # Raw file bytes, organised by storage bucket
│   ├── {bucket}/
│   │   └── {objectKey}  # file content bytes
│   └── objects.json     # media.objects catalog (metadata index)
├── workflows/           # Workflow definitions
│   └── {id}.json
└── agents/              # Agent definitions
    └── {id}.json
```

**`config.json` shape:**

```json
{
  "defaultAdapterId": "local",
  "authToken": "<stored-session-or-developer-token>",
  "supabaseAnonKey": "<optional-if-switching-to-supabase-later>",
  "cloudApiUrl": "https://api.lenserfight.com"
}
```

---

## Current limitations

| Limitation | Detail |
|-----------|--------|
| **Browser local adapter is in-memory** | `LocalFileStorageAdapter` uses an in-memory `Map` in the browser — data is lost on page reload. File-system backing (`~/.lenserfight/`) applies to CLI use only. |
| **R2 adapter is a stub** | `CloudflareR2StorageAdapter` throws "not yet implemented" — do not set `VITE_DATA_SOURCE=r2` in production. |
| **No auth in local mode** | The local adapter does not enforce RLS or access control. It is intended for single-developer local use only. |
| **No multi-user in local mode** | `media.objects` workspace scoping is not enforced when running without Supabase. |

---

## Related

- [Local File Storage Tutorial](/tutorials/getting-started/local-file-storage) — step-by-step: start without Supabase
- [Local Database Setup](/reference/database/local-setup) — Supabase local setup and the no-Supabase alternative
- [Environment Variables](/reference/platform-api/environment-variables) — `VITE_DATA_SOURCE` and adapter config
- [Database Schema: Media](/reference/database/schema-media) — `media.objects` and `media.attachments` table reference
