import type { ErrorRegistryEntry } from './types'

const REGISTRY: Partial<Record<string, ErrorRegistryEntry>> = {}

export function registerErrorRenderer(kind: string, entry: ErrorRegistryEntry): void {
  REGISTRY[kind] = entry
}

export function getErrorEntry(kind: string): ErrorRegistryEntry | undefined {
  return REGISTRY[kind]
}

export function getRegistry(): Readonly<typeof REGISTRY> {
  return REGISTRY
}

/** Test-only reset — production code must NOT call this. */
export function __resetErrorRegistryForTests(): void {
  for (const key of Object.keys(REGISTRY)) {
    delete REGISTRY[key]
  }
}
