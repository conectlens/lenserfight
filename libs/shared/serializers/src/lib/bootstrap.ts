import { BattleJsonSerializer, BattleMarkdownSerializer } from './adapters/battle'
import { LensJsonSerializer, LensMarkdownSerializer } from './adapters/lens'
import { getDefaultRegistry, SerializerRegistry } from './SerializerRegistry'

/**
 * Bootstrap serializer registry with the EX-1 set:
 *   - battle: json, markdown
 *   - lens:   json, markdown
 *
 * Idempotent: callers may invoke this at module load on web, CLI, and
 * edge function entry points. Workflow + agent + bundle land in later
 * phases (EX-2/EX-3) without changing the orchestrator.
 */
let bootstrapped = false

export function bootstrapSerializers(registry: SerializerRegistry = getDefaultRegistry()): SerializerRegistry {
  if (bootstrapped && registry === getDefaultRegistry()) return registry
  registry.register(new BattleJsonSerializer())
  registry.register(new BattleMarkdownSerializer())
  registry.register(new LensJsonSerializer())
  registry.register(new LensMarkdownSerializer())
  if (registry === getDefaultRegistry()) bootstrapped = true
  return registry
}

export function __resetBootstrapForTests(): void {
  bootstrapped = false
}
