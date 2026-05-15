import type { ExportFormat, ExportKind } from '@lenserfight/domain/exports'

import { BattleJsonSerializer, BattleMarkdownSerializer } from './adapters/battle'
import { LensJsonSerializer, LensMarkdownSerializer } from './adapters/lens'
import { WorkflowJsonSerializer, WorkflowMarkdownSerializer } from './adapters/workflow'
import type { Serializer } from './Serializer'
import { getDefaultRegistry, SerializerRegistry } from './SerializerRegistry'

/**
 * Bootstrap serializer registry with the EX-1 set:
 *   - battle:   json, markdown
 *   - lens:     json, markdown
 *   - workflow: json, markdown
 *
 * Truly idempotent: state lives in the registry itself, not in a
 * separate module-scoped flag. This survives HMR reloads, dual module
 * graphs, and concurrent invocations.
 */
const BUILTINS: Array<() => Serializer<unknown>> = [
  () => new BattleJsonSerializer() as unknown as Serializer<unknown>,
  () => new BattleMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new LensJsonSerializer() as unknown as Serializer<unknown>,
  () => new LensMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new WorkflowJsonSerializer() as unknown as Serializer<unknown>,
  () => new WorkflowMarkdownSerializer() as unknown as Serializer<unknown>,
]

export function bootstrapSerializers(
  registry: SerializerRegistry = getDefaultRegistry(),
): SerializerRegistry {
  for (const make of BUILTINS) {
    const s = make()
    if (!registry.supports(s.kind as ExportKind, s.format as ExportFormat)) {
      registry.register(s)
    }
  }
  return registry
}

/**
 * Test helper — preserved for compatibility with existing specs.
 * No internal flag to reset anymore; the registry itself is the source
 * of truth and __resetRegistryForTests() handles that.
 */
export function __resetBootstrapForTests(): void {
  /* no-op: kept for API compatibility */
}
