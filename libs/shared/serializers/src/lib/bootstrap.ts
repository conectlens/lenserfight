import type { ExportFormat, ExportKind } from '@lenserfight/domain/exports'

import {
  AgentJsonSerializer,
  AgentMarkdownSerializer,
  AgentYamlSerializer,
} from './adapters/agent'
import {
  BattleJsonSerializer,
  BattleMarkdownSerializer,
  BattleYamlSerializer,
} from './adapters/battle'
import {
  LensJsonSerializer,
  LensMarkdownSerializer,
  LensYamlSerializer,
} from './adapters/lens'
import {
  WorkflowJsonSerializer,
  WorkflowMarkdownSerializer,
  WorkflowYamlSerializer,
} from './adapters/workflow'
import type { Serializer } from './Serializer'
import { getDefaultRegistry, SerializerRegistry } from './SerializerRegistry'

/**
 * Bootstrap serializer registry with the full adapter set:
 *   - battle:   json, markdown, yaml
 *   - lens:     json, markdown, yaml
 *   - workflow: json, markdown, yaml
 *   - agent:    json, markdown, yaml
 *
 * Truly idempotent: state lives in the registry itself, not in a
 * separate module-scoped flag. This survives HMR reloads, dual module
 * graphs, and concurrent invocations.
 */
const BUILTINS: Array<() => Serializer<unknown>> = [
  () => new BattleJsonSerializer() as unknown as Serializer<unknown>,
  () => new BattleMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new BattleYamlSerializer() as unknown as Serializer<unknown>,
  () => new LensJsonSerializer() as unknown as Serializer<unknown>,
  () => new LensMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new LensYamlSerializer() as unknown as Serializer<unknown>,
  () => new WorkflowJsonSerializer() as unknown as Serializer<unknown>,
  () => new WorkflowMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new WorkflowYamlSerializer() as unknown as Serializer<unknown>,
  () => new AgentJsonSerializer() as unknown as Serializer<unknown>,
  () => new AgentMarkdownSerializer() as unknown as Serializer<unknown>,
  () => new AgentYamlSerializer() as unknown as Serializer<unknown>,
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
