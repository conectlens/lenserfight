import { resolveGatewayConfig } from './config'
import { loadGatewayIdentity, sendHeartbeat } from './heartbeat'
import { scheduleLoop } from './loops'
import { evaluatePreconditions, preconditionsAllPass } from './preconditions'
import { createGatewayPreconditionProbes } from './probes'
import { startServer } from './server'
import { dispatchCommand, pullCommands } from './sync'
import { resolveTailscaleConsent } from './tailscale'

/**
 * `lf-gatewayd` entry point.
 *
 * v1 (Phase D) wires up:
 *   - precondition gate (refuse to start on any failure),
 *   - loopback HTTP server (`/healthz`, `/peers`),
 *   - heartbeat / outbox / pull / leader-lease loops (stubs),
 *   - graceful shutdown on SIGINT/SIGTERM.
 *
 * Heartbeat / sync / lease loops are wired through repositories from
 * `@lenserfight/data/repositories` and `@lenserfight/infra/gateway` once the
 * daemon receives its boot context (device_id, signing key handle).
 *
 * This file intentionally keeps the `main()` shape small so future phases
 * can mount additional handlers without rewriting startup.
 */
async function main(): Promise<void> {
  const config = resolveGatewayConfig()

  const preconditions = await evaluatePreconditions(
    { config },
    createGatewayPreconditionProbes(config)
  )

  printPreconditions(preconditions)

  if (!preconditionsAllPass(preconditions)) {
    process.stderr.write(
      '[lf-gatewayd] refusing to start: one or more preconditions failed.\n' +
        'Run `lf gateway doctor` for guidance.\n'
    )
    process.exit(3)
  }

  const extraBinds: string[] = []
  if (config.tailscale) {
    const ts = resolveTailscaleConsent({ stateDir: config.stateDir })
    if (ts.ok && ts.matched) {
      extraBinds.push(ts.matched.address)
    }
    // If consent failed, the precondition check above already refused startup;
    // this branch is defensive for tests that bypass preconditions.
  }

  // In keys-only mode we skip the heavy signed-coordination plumbing —
  // no identity load, no Supabase heartbeats, no command pull loop. The
  // daemon's only job is to back /keys/* for the web app.
  const identity = config.keysOnly ? null : await loadGatewayIdentity(config)
  const supabaseUrl = config.keysOnly ? '' : (process.env['SUPABASE_URL'] ?? '')
  const supabaseAnonKey = config.keysOnly ? '' : (process.env['SUPABASE_ANON_KEY'] ?? '')
  const cloudConfigured = Boolean(identity && supabaseUrl && supabaseAnonKey)

  const server = await startServer(config, {
    daemonVersion: config.daemonVersion,
    primaryBind: config.bind,
    extraBinds,
    deviceId: identity?.device_id,
    stateDir: config.stateDir,
    onSyncPull: async () => {
      if (!cloudConfigured || !identity) return { claimed: 0 }
      try {
        const cmds = await pullCommands(identity.device_id, supabaseUrl, supabaseAnonKey)
        for (const cmd of cmds) await dispatchCommand(cmd, { config, supabaseUrl, anonKey: supabaseAnonKey })
        return { claimed: cmds.length }
      } catch (err) {
        process.stderr.write(`[sync/pull] ${(err as Error).message}\n`)
        return { claimed: 0 }
      }
    },
  })
  process.stdout.write(`[lf-gatewayd] listening on ${server.url}\n`)
  for (const url of server.extraUrls) {
    process.stdout.write(`[lf-gatewayd] also listening on ${url} (tailscale)\n`)
  }
  if (config.keysOnly) {
    process.stdout.write(
      '[lf-gatewayd] keys-only mode: serving /healthz and /keys/* only — no identity/session/sync loops.\n'
    )
  }

  let heartbeat: { stop: () => void } = { stop: () => undefined }
  let outbox: { stop: () => void } = { stop: () => undefined }
  let pull: { stop: () => void } = { stop: () => undefined }
  let killSwitchTriggered = false
  const triggerKillSwitch = () => {
    if (killSwitchTriggered) return
    killSwitchTriggered = true
    process.stdout.write('[lf-gatewayd] kill_switch received from cloud; shutting down\n')
    void Promise.resolve()
      .then(async () => {
        heartbeat.stop()
        outbox.stop()
        pull.stop()
        await server.close().catch(() => undefined)
      })
      .finally(() => process.exit(0))
  }

  const fireHeartbeat = async () => {
    if (!cloudConfigured || !identity) return
    try {
      const result = await sendHeartbeat(config, identity, supabaseUrl, supabaseAnonKey)
      if (result.killSwitch) triggerKillSwitch()
    } catch (err) {
      process.stderr.write(`[heartbeat] ${(err as Error).message}\n`)
    }
  }

  if (!config.keysOnly) {
    heartbeat = scheduleLoop('heartbeat', config.heartbeatIntervalMs, fireHeartbeat)
    outbox = scheduleLoop('outbox', config.outboxFlushIntervalMs, async () => {
      // Flush sync_outbox via gatewaySyncRepository.push.
    })
    pull = scheduleLoop('sync', config.pullIntervalMs, async () => {
      if (!cloudConfigured || !identity) return
      try {
        const cmds = await pullCommands(identity.device_id, supabaseUrl, supabaseAnonKey)
        for (const cmd of cmds) {
          await dispatchCommand(cmd, { config, supabaseUrl, anonKey: supabaseAnonKey })
        }
      } catch (err) {
        process.stderr.write(`[sync] ${(err as Error).message}\n`)
      }
    })

    // Fire heartbeat once on startup so we surface kill_switch immediately.
    void fireHeartbeat()
  }

  const shutdown = async (signal: string) => {
    process.stdout.write(`[lf-gatewayd] received ${signal}; shutting down\n`)
    heartbeat.stop()
    outbox.stop()
    pull.stop()
    try {
      await server.close()
    } catch (err) {
      process.stderr.write(`[lf-gatewayd] close error: ${(err as Error).message}\n`)
    }
    process.exit(0)
  }

  process.once('SIGINT', () => void shutdown('SIGINT'))
  process.once('SIGTERM', () => void shutdown('SIGTERM'))
}

function printPreconditions(results: { id: string; ok: boolean; message: string }[]): void {
  for (const r of results) {
    const tag = r.ok ? 'pass' : 'FAIL'
    process.stdout.write(`[precondition] ${tag} ${r.id}: ${r.message}\n`)
  }
}

main().catch((err) => {
  process.stderr.write(`[lf-gatewayd] fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
