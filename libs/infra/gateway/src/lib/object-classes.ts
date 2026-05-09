import type {
  ObjectClassAuthority,
  ObjectClassDescriptor,
  ObjectClassName,
} from '@lenserfight/types'

/**
 * Per-object-class registry of authority and merge policy.
 *
 * Source of truth for `docs/explanation/gateway/sync.md` §"Object class authority".
 *
 * - **Cloud-authoritative**: read-only on edges; pushes are rejected by the
 *   server with `cloud_authoritative`.
 * - **Local-only**: never enters the outbox; pushes are rejected with
 *   `local_only_class`.
 * - **Conflict-aware**: bidirectional sync; default merge is LWW per field with
 *   a vector clock tiebreak (see `conflict-resolver.ts`).
 */

const CLOUD_AUTH: ObjectClassName[] = [
  'xp_total',
  'trust_evaluation',
  'battle_result',
  'policy',
  'budget',
  'kill_switch',
  'dark_launch',
  'ai_catalog',
]

const LOCAL_ONLY: ObjectClassName[] = [
  'byok_key',
  'local_battle',
  'scratchpad_draft',
  'keychain_entry',
  'private_key',
]

const CONFLICT_AWARE: ObjectClassName[] = [
  'agent_config',
  'agent_team_graph',
  'workflow_definition',
  'lens_draft',
  'runner_metadata',
  'non_secret_pref',
  'automation_registry_entry',
]

const REGISTRY: ReadonlyMap<ObjectClassName, ObjectClassDescriptor> = new Map<
  ObjectClassName,
  ObjectClassDescriptor
>(
  [
    ...CLOUD_AUTH.map<ObjectClassDescriptor>((name) => ({
      name,
      authority: 'cloud',
    })),
    ...LOCAL_ONLY.map<ObjectClassDescriptor>((name) => ({
      name,
      authority: 'local',
    })),
    ...CONFLICT_AWARE.map<ObjectClassDescriptor>((name) => ({
      name,
      authority: 'conflict_aware',
    })),
  ].map((d) => [d.name, d] as const)
)

export function getObjectClass(
  name: ObjectClassName
): ObjectClassDescriptor | null {
  return REGISTRY.get(name) ?? null
}

export function listObjectClasses(): ObjectClassDescriptor[] {
  return Array.from(REGISTRY.values())
}

export function objectClassesByAuthority(
  authority: ObjectClassAuthority
): ObjectClassName[] {
  return Array.from(REGISTRY.values())
    .filter((d) => d.authority === authority)
    .map((d) => d.name)
}

export function isCloudAuthoritative(name: ObjectClassName): boolean {
  return REGISTRY.get(name)?.authority === 'cloud'
}

export function isLocalOnly(name: ObjectClassName): boolean {
  return REGISTRY.get(name)?.authority === 'local'
}

export function isConflictAware(name: ObjectClassName): boolean {
  return REGISTRY.get(name)?.authority === 'conflict_aware'
}

/** Class names that the daemon may legitimately enqueue to the outbox. */
export function pushableObjectClasses(): ObjectClassName[] {
  return objectClassesByAuthority('conflict_aware')
}

/** Class names that the daemon may pull from the cloud (i.e. not local-only). */
export function pullableObjectClasses(): ObjectClassName[] {
  return [
    ...objectClassesByAuthority('cloud'),
    ...objectClassesByAuthority('conflict_aware'),
  ]
}
