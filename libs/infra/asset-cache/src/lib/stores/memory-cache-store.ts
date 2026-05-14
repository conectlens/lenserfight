import type { AssetCategory } from '@lenserfight/utils/cdn-url'
import type { CacheEntry } from '../types/cache-entry'
import type { MemoryCacheConfig, CategoryConfig } from '../config/asset-cache-config'

interface MemoryEntry {
  entry: CacheEntry
  sizeBytes: number
  lastAccessed: number
  expiresAt: number
  category: AssetCategory
}

export interface MemoryCacheStoreOptions {
  config: MemoryCacheConfig
  categories: Record<AssetCategory, CategoryConfig>
  now?: () => number
  onEvict?: (key: string, reason: 'lru' | 'ttl' | 'size-pressure') => void
}

export class MemoryCacheStore {
  private readonly entries = new Map<string, MemoryEntry>()
  private totalBytes = 0
  private readonly categoryBytes = new Map<AssetCategory, number>()
  private readonly options: MemoryCacheStoreOptions
  private sweepHandle: ReturnType<typeof setInterval> | null = null
  private disposed = false

  constructor(options: MemoryCacheStoreOptions) {
    this.options = options
  }

  startBackgroundSweep(intervalMs = 30_000): void {
    if (this.sweepHandle || this.disposed) return
    if (typeof globalThis.setInterval !== 'function') return
    this.sweepHandle = setInterval(() => this.sweepExpired(), intervalMs)
  }

  stopBackgroundSweep(): void {
    if (this.sweepHandle) {
      clearInterval(this.sweepHandle)
      this.sweepHandle = null
    }
  }

  get(key: string): CacheEntry | null {
    const memEntry = this.entries.get(key)
    if (!memEntry) return null
    const now = this.now()
    if (now > memEntry.expiresAt) {
      this.deleteInternal(key, 'ttl')
      return null
    }
    memEntry.lastAccessed = now
    this.entries.delete(key)
    this.entries.set(key, memEntry)
    return memEntry.entry
  }

  set(key: string, entry: CacheEntry): void {
    if (this.disposed) return
    const category = entry.meta.category
    const categoryConfig = this.options.categories[category]
    if (!categoryConfig || categoryConfig.memoryMaxEntries === 0) return

    const sizeBytes = entry.meta.sizeBytes
    if (sizeBytes > 2 * 1024 * 1024) return

    if (this.entries.has(key)) {
      this.deleteInternal(key, 'lru')
    }

    const now = this.now()
    const expiresAt = entry.meta.expiresAt > 0
      ? entry.meta.expiresAt
      : now + this.options.config.defaultTTLMs

    const memEntry: MemoryEntry = {
      entry,
      sizeBytes,
      lastAccessed: now,
      expiresAt,
      category,
    }

    this.entries.set(key, memEntry)
    this.totalBytes += sizeBytes
    this.categoryBytes.set(category, (this.categoryBytes.get(category) ?? 0) + sizeBytes)

    this.enforceCategoryCeiling(category)
    this.enforceGlobalCeiling()
    this.enforceEntryCount()
  }

  delete(key: string): boolean {
    return this.deleteInternal(key, 'lru')
  }

  has(key: string): boolean {
    const memEntry = this.entries.get(key)
    if (!memEntry) return false
    if (this.now() > memEntry.expiresAt) {
      this.deleteInternal(key, 'ttl')
      return false
    }
    return true
  }

  clear(): void {
    for (const key of [...this.entries.keys()]) {
      this.deleteInternal(key, 'lru')
    }
  }

  size(): number {
    return this.entries.size
  }

  totalBytesStored(): number {
    return this.totalBytes
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.stopBackgroundSweep()
    for (const [, memEntry] of this.entries) {
      if (memEntry.entry.objectUrl) {
        this.revokeObjectUrl(memEntry.entry.objectUrl)
      }
    }
    this.entries.clear()
    this.categoryBytes.clear()
    this.totalBytes = 0
  }

  private deleteInternal(key: string, reason: 'lru' | 'ttl' | 'size-pressure'): boolean {
    const memEntry = this.entries.get(key)
    if (!memEntry) return false
    this.entries.delete(key)
    this.totalBytes -= memEntry.sizeBytes
    const catTotal = this.categoryBytes.get(memEntry.category) ?? 0
    this.categoryBytes.set(memEntry.category, Math.max(0, catTotal - memEntry.sizeBytes))
    if (memEntry.entry.objectUrl) {
      this.revokeObjectUrl(memEntry.entry.objectUrl)
    }
    this.options.onEvict?.(key, reason)
    return true
  }

  private sweepExpired(): void {
    const now = this.now()
    for (const [key, memEntry] of this.entries) {
      if (now > memEntry.expiresAt) {
        this.deleteInternal(key, 'ttl')
      }
    }
  }

  private enforceCategoryCeiling(category: AssetCategory): void {
    const ceiling = this.options.categories[category]?.memoryCeilingBytes ?? 0
    if (ceiling === 0) return
    let used = this.categoryBytes.get(category) ?? 0
    if (used <= ceiling) return
    for (const [key, memEntry] of this.entries) {
      if (memEntry.category !== category) continue
      if (used <= ceiling) break
      used -= memEntry.sizeBytes
      this.deleteInternal(key, 'size-pressure')
    }
  }

  private enforceGlobalCeiling(): void {
    const ceiling = this.options.config.maxSizeBytes
    if (this.totalBytes <= ceiling) return
    const target = Math.floor(ceiling * 0.8)
    for (const [key] of this.entries) {
      if (this.totalBytes <= target) break
      this.deleteInternal(key, 'size-pressure')
    }
  }

  private enforceEntryCount(): void {
    const max = this.options.config.maxEntries
    if (this.entries.size <= max) return
    for (const [key] of this.entries) {
      if (this.entries.size <= max) break
      this.deleteInternal(key, 'lru')
    }
  }

  private revokeObjectUrl(url: string): void {
    try {
      if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url)
      }
    } catch {
      // Ignore — runtime may not support revocation.
    }
  }

  private now(): number {
    return this.options.now ? this.options.now() : Date.now()
  }
}
