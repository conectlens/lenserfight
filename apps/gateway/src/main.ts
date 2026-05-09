import { resolveGatewayConfig } from './config'
import { scheduleLoop } from './loops'
import { evaluatePreconditions, preconditionsAllPass } from './preconditions'
import { startServer } from './server'
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
    {
      // Stubs: in production these reach Supabase + the keychain. Phase D-2
      // wires the real probes once the device identity bootstrap (init.ts)
      // has run at least once.
      checkClockSkew: async () => ({ ok: true, skewSeconds: 0 }),
      checkKeychainPresent: async () => true,
      checkIdentityPresent: async () => false,
      checkSessionPresent: async () => Boolean(process.env['LENSERFIGHT_API_KEY']),
      checkLenserActive: async () => true,
      checkKillSwitch: async () => false,
    }
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

  const server = await startServer(config, {
    daemonVersion: config.daemonVersion,
    extraBinds,
  })
  process.stdout.write(`[lf-gatewayd] listening on ${server.url}\n`)
  for (const url of server.extraUrls) {
    process.stdout.write(`[lf-gatewayd] also listening on ${url} (tailscale)\n`)
  }

  // Loops — stubs in Phase D, wired through repos in subsequent phases.
  const heartbeat = scheduleLoop('heartbeat', config.heartbeatIntervalMs, async () => {
    // POST devices.fn_device_heartbeat once identity is loaded.
  })
  const outbox = scheduleLoop('outbox', config.outboxFlushIntervalMs, async () => {
    // Flush sync_outbox via gatewaySyncRepository.push.
  })
  const pull = scheduleLoop('pull', config.pullIntervalMs, async () => {
    // Pull via gatewaySyncRepository.pull(pullableObjectClasses()).
  })

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
