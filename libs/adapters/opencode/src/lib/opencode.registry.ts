import type { OpencodeToolAdapterV1 } from './opencode-tool-adapter'

type AdapterFactory = () => OpencodeToolAdapterV1

const ADAPTERS = new Map<string, AdapterFactory>()

export function registerOpencodeToolAdapter(id: string, factory: AdapterFactory): void {
  if (!id) throw new Error('Opencode tool adapter id must be a non-empty string')
  ADAPTERS.set(id, factory)
}

export function unregisterOpencodeToolAdapter(id: string): void {
  ADAPTERS.delete(id)
}

export function getOpencodeToolAdapter(id: string): OpencodeToolAdapterV1 {
  const factory = ADAPTERS.get(id)
  if (!factory) throw new Error(`Unknown opencode tool adapter: ${id}`)
  return factory()
}

export function listOpencodeToolAdapters(): string[] {
  return Array.from(ADAPTERS.keys())
}

/**
 * Test-only reset hook. Production code MUST NOT call this.
 */
export function __resetOpencodeRegistryForTests(): void {
  ADAPTERS.clear()
}
