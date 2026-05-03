import type { ConnectorAdapterV1 } from './connector-adapter'

type AdapterFactory = () => ConnectorAdapterV1

const ADAPTERS = new Map<string, AdapterFactory>()

let defaultAdapterId: string | null = null

export function registerConnectorAdapter(id: string, factory: AdapterFactory): void {
  if (!id) throw new Error('Connector adapter id must be a non-empty string')
  ADAPTERS.set(id, factory)
  if (defaultAdapterId === null) defaultAdapterId = id
}

export function unregisterConnectorAdapter(id: string): void {
  ADAPTERS.delete(id)
  if (defaultAdapterId === id) defaultAdapterId = null
}

export function getConnectorAdapter(id?: string): ConnectorAdapterV1 {
  const target = id ?? defaultAdapterId
  if (!target) throw new Error('No connector adapter registered')
  const factory = ADAPTERS.get(target)
  if (!factory) throw new Error(`Unknown connector adapter: ${target}`)
  return factory()
}

export function setDefaultConnectorAdapter(id: string): void {
  if (!ADAPTERS.has(id)) throw new Error(`Cannot set default to unregistered adapter: ${id}`)
  defaultAdapterId = id
}

export function listConnectorAdapters(): string[] {
  return Array.from(ADAPTERS.keys())
}

/**
 * Test-only reset hook. Production code MUST NOT call this.
 */
export function __resetConnectorRegistryForTests(): void {
  ADAPTERS.clear()
  defaultAdapterId = null
}
