import {
  ExportUnsupportedError,
  type ExportFormat,
  type ExportKind,
} from '@lenserfight/domain/exports'

import type { Serializer } from './Serializer'

/**
 * SerializerRegistry — Pure Fabrication + Indirection.
 *
 * Single lookup table keyed by `${kind}:${format}`. Orchestrators and
 * UI ask the registry; they never import a specific serializer. This
 * keeps the orchestrator's coupling to format-specific code at zero.
 */
export class SerializerRegistry {
  private readonly map = new Map<string, Serializer<unknown>>()

  register<T>(serializer: Serializer<T>): void {
    const key = this.keyFor(serializer.kind, serializer.format)
    if (this.map.has(key)) {
      throw new Error(`SerializerRegistry: duplicate registration for ${key}`)
    }
    this.map.set(key, serializer as Serializer<unknown>)
  }

  resolve(kind: ExportKind, format: ExportFormat): Serializer<unknown> {
    const found = this.map.get(this.keyFor(kind, format))
    if (!found) throw new ExportUnsupportedError(kind, format)
    return found
  }

  supports(kind: ExportKind, format: ExportFormat): boolean {
    return this.map.has(this.keyFor(kind, format))
  }

  formatsFor(kind: ExportKind): ExportFormat[] {
    const out: ExportFormat[] = []
    for (const key of this.map.keys()) {
      const [k, f] = key.split(':') as [ExportKind, ExportFormat]
      if (k === kind) out.push(f)
    }
    return out
  }

  private keyFor(kind: ExportKind, format: ExportFormat): string {
    return `${kind}:${format}`
  }
}

/** Process-local singleton (kept private — callers use the bootstrap exports). */
let defaultRegistry: SerializerRegistry | null = null

export function getDefaultRegistry(): SerializerRegistry {
  if (!defaultRegistry) defaultRegistry = new SerializerRegistry()
  return defaultRegistry
}

export function __resetRegistryForTests(): void {
  defaultRegistry = null
}
