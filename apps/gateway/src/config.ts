import os from 'node:os'
import path from 'node:path'

export interface GatewayConfig {
  bind: string
  port: number
  tailscale: boolean
  stateDir: string
  keychainService: string
  daemonVersion: string
  heartbeatIntervalMs: number
  pullIntervalMs: number
  outboxFlushIntervalMs: number
  clockSkewLimitSeconds: number
  /**
   * Keys-only mode: serve only /healthz and /keys/*. Skips the heavy
   * preconditions (identity, session, lenser, kill_switch) and the
   * heartbeat/outbox/sync loops. Use this when you just want to back the
   * web app's Local Keys feature without setting up signed coordination.
   */
  keysOnly: boolean
}

export interface ResolveConfigInput {
  bind?: string
  port?: number
  tailscale?: boolean
  keysOnly?: boolean
  env?: NodeJS.ProcessEnv
}

const DEFAULTS = {
  bind: '127.0.0.1',
  port: 38080,
  daemonVersion: 'lf-gatewayd/0.1.0',
  heartbeatIntervalMs: 30_000,
  pullIntervalMs: 10_000,
  outboxFlushIntervalMs: 5_000,
  clockSkewLimitSeconds: 300,
} as const

export function resolveGatewayConfig(input: ResolveConfigInput = {}): GatewayConfig {
  const env = input.env ?? process.env
  const bind = input.bind ?? env['LF_GATEWAY_BIND'] ?? DEFAULTS.bind
  const port = input.port ?? Number(env['LF_GATEWAY_PORT'] ?? DEFAULTS.port)
  const tailscale = input.tailscale ?? env['LF_GATEWAY_TAILSCALE'] === '1'
  const keysOnly = input.keysOnly ?? env['LF_GATEWAY_KEYS_ONLY'] === '1'
  const stateDir = path.join(os.homedir(), '.lenserfight', 'gateway')

  return {
    bind,
    port,
    tailscale,
    keysOnly,
    stateDir,
    keychainService: 'lenserfight-gateway',
    daemonVersion: DEFAULTS.daemonVersion,
    heartbeatIntervalMs: DEFAULTS.heartbeatIntervalMs,
    pullIntervalMs: DEFAULTS.pullIntervalMs,
    outboxFlushIntervalMs: DEFAULTS.outboxFlushIntervalMs,
    clockSkewLimitSeconds: DEFAULTS.clockSkewLimitSeconds,
  }
}
