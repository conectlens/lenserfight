import { resolveTailscaleConsent } from './tailscale'

import type { GatewayConfig } from './config'
import type { TailscaleInterface } from '@lenserfight/infra/gateway'

export type PreconditionId =
  | 'clock_skew'
  | 'keychain_present'
  | 'identity_present'
  | 'session_present'
  | 'kill_switch'
  | 'lenser_active'
  | 'no_service_role'
  | 'bind_safe'
  | 'tailscale_consent'

export interface PreconditionResult {
  id: PreconditionId
  ok: boolean
  message: string
}

export interface PreconditionsContext {
  config: GatewayConfig
  env?: NodeJS.ProcessEnv
  /** Override CGNAT interface detection (tests; optional doctor parity). */
  tailscaleDetector?: () => TailscaleInterface[]
}

/**
 * The daemon's refusal-to-start checklist. Each precondition is an independent,
 * machine-parseable verdict; `lf gateway doctor --check daemon` mirrors these.
 *
 * The implementations here are intentionally minimal — actual probing of the
 * keychain / Supabase happens via the data + utils layers. Phase D wires this
 * up in `runDaemon`.
 */
export async function evaluatePreconditions(
  ctx: PreconditionsContext,
  probes: {
    checkClockSkew: () => Promise<{ ok: boolean; skewSeconds: number }>
    checkKeychainPresent: () => Promise<boolean>
    checkIdentityPresent: () => Promise<boolean>
    checkSessionPresent: () => Promise<boolean>
    checkLenserActive: () => Promise<boolean>
    checkKillSwitch: () => Promise<boolean>
  }
): Promise<PreconditionResult[]> {
  const env = ctx.env ?? process.env
  const results: PreconditionResult[] = []
  const keysOnly = ctx.config.keysOnly === true

  // bind safety check
  // In keys-only mode every `/keys/*` request is authenticated with a bearer
  // token + origin allow-list, so binding to non-loopback (e.g. a Tailscale
  // or LAN interface) is acceptable when the operator explicitly opted in.
  // In full-coordination mode we keep the original v1 refusal — the signed
  // sync surface has weaker per-request gating.
  if (ctx.config.bind === '0.0.0.0' && !keysOnly) {
    results.push({
      id: 'bind_safe',
      ok: false,
      message: 'Bind 0.0.0.0 is forbidden in v1. Use 127.0.0.1 or --tailscale (or pass --keys-only for the local-keys-only surface).',
    })
  } else {
    results.push({
      id: 'bind_safe',
      ok: true,
      message:
        ctx.config.bind === '0.0.0.0'
          ? `bind=0.0.0.0 (keys-only — exposed to every interface; protected by bearer + origin allow-list)`
          : `bind=${ctx.config.bind}`,
    })
  }

  // service_role guard
  const hasServiceRole = Boolean(env['SUPABASE_SERVICE_ROLE_KEY'])
  results.push({
    id: 'no_service_role',
    ok: !hasServiceRole,
    message: hasServiceRole
      ? 'SUPABASE_SERVICE_ROLE_KEY must not be present in daemon runtime'
      : 'no service_role detected',
  })

  // probes
  const clock = await probes.checkClockSkew()
  results.push({
    id: 'clock_skew',
    ok: clock.ok,
    message: `skew=${clock.skewSeconds}s (limit=${ctx.config.clockSkewLimitSeconds}s; offline lower bound — use \`lf gateway doctor --check clock\` for online skew)`,
  })

  const keychain = await probes.checkKeychainPresent()
  results.push({
    id: 'keychain_present',
    ok: keychain,
    message: keychain ? 'keychain reachable' : 'keychain unavailable',
  })

  // Signed-coordination preconditions — only meaningful for the full daemon.
  // Skip them in keys-only mode so users can pair Local Keys without first
  // setting up an Ed25519 identity, Supabase session, or owner Lenser.
  if (!keysOnly) {
    const identity = await probes.checkIdentityPresent()
    results.push({
      id: 'identity_present',
      ok: identity,
      message: identity
        ? 'Ed25519 keypair present'
        : 'no Ed25519 keypair — run `lf-gateway-init` first',
    })

    const session = await probes.checkSessionPresent()
    results.push({
      id: 'session_present',
      ok: session,
      message: session ? 'Supabase session present' : 'no Supabase session',
    })

    const lenser = await probes.checkLenserActive()
    results.push({
      id: 'lenser_active',
      ok: lenser,
      message: lenser ? 'owner Lenser active' : 'owner Lenser is paused or missing',
    })

    const kill = await probes.checkKillSwitch()
    results.push({
      id: 'kill_switch',
      ok: !kill,
      message: kill ? 'global_kill_switch=true' : 'global_kill_switch=false',
    })
  }

  // Tailscale bind consent — only when --tailscale was requested.
  if (ctx.config.tailscale) {
    const ts = resolveTailscaleConsent({
      stateDir: ctx.config.stateDir,
      ...(ctx.tailscaleDetector ? { detector: ctx.tailscaleDetector } : {}),
    })
    if (ts.ok && ts.matched) {
      results.push({
        id: 'tailscale_consent',
        ok: true,
        message: `tailscale=${ts.matched.name} ${ts.matched.address}`,
      })
    } else {
      const msg =
        ts.reason === 'no_consent_file'
          ? 'no consent file at ~/.lenserfight/gateway/tailscale-consent.json — grant with `lf gateway consent grant tailscale`'
          : ts.reason === 'no_tailscale_interface'
            ? 'no CGNAT interface detected (looking for 100.64.0.0/10 on tailscale*/wg*/utun*)'
            : ts.reason === 'fingerprint_mismatch'
              ? 'live interface does not match consent fingerprint — re-run `lf gateway consent grant tailscale`'
              : 'tailscale consent unavailable'
      results.push({ id: 'tailscale_consent', ok: false, message: msg })
    }
  }

  return results
}

export function preconditionsAllPass(results: PreconditionResult[]): boolean {
  return results.every((r) => r.ok)
}
