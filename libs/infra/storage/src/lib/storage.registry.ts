import { SupabaseStorageAdapter } from './supabase-storage.adapter'
import { LocalFileStorageAdapter } from './local-storage.adapter'
import { CloudflareR2StorageAdapter } from './r2-storage.adapter'
import type { StorageAdapterPort, StorageAdapterId } from './storage.types'
import { isFileDataBackend, readEnv } from '@lenserfight/utils/env'

const ADAPTERS: Record<StorageAdapterId, () => StorageAdapterPort> = {
  supabase: () => new SupabaseStorageAdapter(),
  local: () => new LocalFileStorageAdapter(),
  r2: () => new CloudflareR2StorageAdapter(),
}

function readStorageAdapterId(): StorageAdapterId {
  const raw = readEnv('STORAGE_ADAPTER')
  if (raw === 'r2' || raw === 'local' || raw === 'supabase') return raw
  return isFileDataBackend ? 'local' : 'supabase'
}

let defaultAdapterId: StorageAdapterId = readStorageAdapterId()

export function getStorageAdapter(id?: StorageAdapterId): StorageAdapterPort {
  const factory = ADAPTERS[id ?? defaultAdapterId]
  if (!factory) throw new Error(`Unknown storage adapter: ${id}`)
  return factory()
}

export function setDefaultStorageAdapter(id: StorageAdapterId): void {
  defaultAdapterId = id
}
