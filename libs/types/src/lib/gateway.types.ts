/**
 * Trust Gateway shared types — RFC-0003.
 *
 * These types live in `@lenserfight/types` so that `apps/cli`, `apps/gateway`,
 * `libs/data/repositories/gateway*`, and `libs/infra/gateway` agree on the
 * envelope shape, identity, sync, and peer roles.
 */

// ─── Identity ─────────────────────────────────────────────────────────────────

export type DeviceSigningAlgo = 'ed25519'

export interface DeviceIdentity {
  /** Local device id (UUID) — equal to devices.registered_devices.id. */
  device_id: string
  /** Base64 raw 32-byte public key. */
  public_key: string
  /** Currently always 'ed25519'. */
  signing_algo: DeviceSigningAlgo
  /** Daemon process version string, e.g. 'lf-gatewayd/0.1.0'. */
  daemon_version?: string
}

// ─── Signed envelope (RFC-0003 §3) ────────────────────────────────────────────

export interface SignedEnvelope<TBody = unknown> {
  v: 1
  alg: 'ed25519'
  /** Device id — must equal a devices.registered_devices.id. */
  kid: string
  /** Unix seconds at sign time. */
  iat: number
  /** 128-bit base64url nonce. */
  nonce: string
  body: TBody
  /** Detached Ed25519 signature, base64url. */
  sig: string
}

export type EnvelopeFailureReason =
  | 'malformed_envelope'
  | 'unsupported_version'
  | 'unsupported_algorithm'
  | 'signature_mismatch'
  | 'iat_window'
  | 'nonce_invalid'
  | 'nonce_replay'
  | 'kid_mismatch'

// ─── Sync engine ──────────────────────────────────────────────────────────────

/** Authority designation for a synchronizable object class. */
export type ObjectClassAuthority = 'cloud' | 'local' | 'conflict_aware'

/** Names of the canonical object classes. */
export type ObjectClassName =
  // cloud-authoritative
  | 'xp_total'
  | 'trust_evaluation'
  | 'battle_result'
  | 'policy'
  | 'budget'
  | 'kill_switch'
  | 'dark_launch'
  | 'ai_catalog'
  // local-only
  | 'byok_key'
  | 'local_battle'
  | 'scratchpad_draft'
  | 'keychain_entry'
  | 'private_key'
  // conflict-aware
  | 'agent_config'
  | 'agent_team_graph'
  | 'workflow_definition'
  | 'lens_draft'
  | 'runner_metadata'
  | 'non_secret_pref'
  | 'automation_registry_entry'

export interface ObjectClassDescriptor {
  name: ObjectClassName
  authority: ObjectClassAuthority
  /** Optional human-readable description. */
  description?: string
}

/** A sync envelope body (push). */
export interface SyncPushBody {
  entries: SyncEntry[]
}

export interface SyncEntry {
  object_class: ObjectClassName
  object_id: string
  op: 'upsert' | 'delete'
  payload: unknown
  /** Vector clock keyed by device id. */
  vclock: Record<string, number>
}

export interface SyncPullBody {
  object_classes: ObjectClassName[]
  /** Optional explicit limit; server caps at 200. */
  limit?: number
}

export interface SyncStatus {
  object_class: ObjectClassName
  watermark: string | null
  outbox_depth: number
  last_error: string | null
}

// ─── Peers + leader election ──────────────────────────────────────────────────

export type PeerRole = 'leader' | 'follower'

export interface PeerSummary {
  device_id: string
  name: string
  role: PeerRole
  trust_level:
    | 'pending'
    | 'approved'
    | 'trusted'
    | 'offline'
    | 'revoked'
    | 'blocked'
    | 'unhealthy'
  last_heartbeat_at: string | null
  daemon_version: string | null
  gateway_status: string
}

// ─── Doctor diagnostics ───────────────────────────────────────────────────────

export type DoctorCheckId =
  | 'clock'
  | 'keychain'
  | 'identity'
  | 'daemon'
  | 'sync'
  | 'policy'
  | 'transport'

export interface DoctorCheckResult {
  id: DoctorCheckId
  status: 'pass' | 'fail' | 'skipped'
  message: string
  data?: Record<string, unknown>
}

export interface DoctorReport {
  ok: boolean
  checks: DoctorCheckResult[]
  generated_at: string
}

// ─── CLI policy snapshot ──────────────────────────────────────────────────────

export interface PolicySnapshot {
  global_kill_switch: boolean
  runner_paused: boolean
  budget_enforce: boolean
  max_parallel_runs: number
  dark_launch_enabled: boolean
  dark_launch_pct: number
}
