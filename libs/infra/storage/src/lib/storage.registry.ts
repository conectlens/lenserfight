import { SupabaseStorageAdapter } from './supabase-storage.adapter'
import { LocalFileStorageAdapter } from './local-storage.adapter'
import type { StorageAdapterPort, StorageAdapterId } from './storage.types'
import { isFileDataBackend } from '@lenserfight/utils/env'

const ADAPTERS: Record<StorageAdapterId, () => StorageAdapterPort> = {
  supabase: () => new SupabaseStorageAdapter(),
  local: () => new LocalFileStorageAdapter(),
  r2: () => {
    throw new Error('Cloudflare R2 storage adapter is not implemented. Use "supabase" or "local".')
  },
}

// Default to local adapter when VITE_DATA_SOURCE=file so no Supabase is needed.
let defaultAdapterId: StorageAdapterId = isFileDataBackend ? 'local' : 'supabase'

export function getStorageAdapter(id?: StorageAdapterId): StorageAdapterPort {
  const factory = ADAPTERS[id ?? defaultAdapterId]
  if (!factory) throw new Error(`Unknown storage adapter: ${id}`)
  return factory()
}

export function setDefaultStorageAdapter(id: StorageAdapterId): void {
  if (id === 'r2') {
    throw new Error('Cloudflare R2 storage adapter is not implemented. Use "supabase" or "local".')
  }
  defaultAdapterId = id
}
