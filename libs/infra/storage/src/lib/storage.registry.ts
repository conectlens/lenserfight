import { SupabaseStorageAdapter } from './supabase-storage.adapter'
import { LocalFileStorageAdapter } from './local-storage.adapter'
import type { StorageAdapterPort, StorageAdapterId } from './storage.types'

const ADAPTERS: Record<StorageAdapterId, () => StorageAdapterPort> = {
  supabase: () => new SupabaseStorageAdapter(),
  local: () => new LocalFileStorageAdapter(),
  r2: () => {
    throw new Error('Cloudflare R2 storage adapter is not implemented. Use "supabase" or "local".')
  },
}

let defaultAdapterId: StorageAdapterId = 'supabase'

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
