import { randomBytes } from 'node:crypto'

import { resolveGatewayConfig } from './config'
import { loadGatewayIdentity, sendHeartbeat } from './heartbeat'
import { scheduleLoop } from './loops'
import { evaluatePreconditions, preconditionsAllPass } from './preconditions'
import { createGatewayPreconditionProbes } from './probes'
import { startServer } from './server'
import { dispatchCommand, outboxFlush, pullCommands } from './sync'
import { resolveTailscaleConsent } from './tailscale'
import { BEARER_KEYCHAIN_SERVICE, BEARER_KEYCHAIN_ACCOUNT } from './auth/bearer'
import { keychain } from '@lenserfight/utils/keychain'

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

  await printPairingBlock(server.url)

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
      if (!cloudConfigured || !identity) return
      await outboxFlush({
        config,
        deviceId:  identity.device_id,
        publicKey: identity.public_key,
        supabaseUrl,
        anonKey: supabaseAnonKey,
        takeBatch: () => [], // SyncEngine not yet instantiated; empty queue = no-op
      })
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

async function printPairingBlock(gatewayUrl: string): Promise<void> {
  let token = await keychain.getSecret({ service: BEARER_KEYCHAIN_SERVICE, account: BEARER_KEYCHAIN_ACCOUNT })
  if (!token) {
    token = randomBytes(32).toString('base64url')
    await keychain.setSecret({ service: BEARER_KEYCHAIN_SERVICE, account: BEARER_KEYCHAIN_ACCOUNT, secret: token })
  }

  const isTTY = process.stdout.isTTY
  const c = {
    reset:  isTTY ? '\x1b[0m'  : '',
    bold:   isTTY ? '\x1b[1m'  : '',
    cyan:   isTTY ? '\x1b[36m' : '',
    yellow: isTTY ? '\x1b[33m' : '',
    green:  isTTY ? '\x1b[32m' : '',
    dim:    isTTY ? '\x1b[2m'  : '',
  }

  const w = 64
  const line  = '─'.repeat(w)
  const blank = ' '.repeat(w)
  const out = process.stdout.write.bind(process.stdout)

  // Write a single box row. `visible` is the text as it will appear on screen
  // (no ANSI codes). `colored` is the same text with ANSI codes applied.
  // Padding is computed from the visible length so it is always non-negative.
  function row(visible: string, colored: string): void {
    const pad = ' '.repeat(Math.max(0, w - visible.length))
    out(`${c.cyan}│${c.reset}${colored}${pad}${c.cyan}│${c.reset}\n`)
  }

  out('\n')
  out(`${c.cyan}┌${line}┐${c.reset}\n`)
  row('', '')
  row('  Gateway ready — pair the web app in 3 steps',
      `  ${c.bold}Gateway ready — pair the web app in 3 steps${c.reset}`)
  row('', '')
  row('  Prerequisite: run `lf keys init` once (adds master passphrase).',
      `  ${c.yellow}Prerequisite: run \`lf keys init\` once (adds master passphrase).${c.reset}`)
  row('', '')
  row('  Step 1 — copy this token:',
      `  ${c.dim}Step 1 — copy this token:${c.reset}`)
  row('', '')

  // Token — wrap at w-2 so the indent + chunk always fits inside the border.
  const indent = '  '
  const maxChars = w - indent.length
  for (let i = 0; i < token.length; i += maxChars) {
    const chunk = token.slice(i, i + maxChars)
    row(`${indent}${chunk}`, `${indent}${c.green}${c.bold}${chunk}${c.reset}`)
  }

  row('', '')
  row('  Step 2 — open the web app → any Funding panel → Local Keys.',
      `  ${c.dim}Step 2 — open the web app → any Funding panel → Local Keys.${c.reset}`)
  row('', '')
  row('  Step 3 — paste the token into the "Pair gateway" box.',
      `  ${c.dim}Step 3 — paste the token into the "Pair gateway" box.${c.reset}`)
  row('', '')
  row(`  Gateway: ${gatewayUrl}`,
      `  ${c.yellow}Gateway: ${gatewayUrl}${c.reset}`)
  row('  Token is in sessionStorage — re-run `lf gateway pair` after',
      `  ${c.dim}Token is in sessionStorage — re-run \`lf gateway pair\` after${c.reset}`)
  row('  closing the tab, or `lf gateway pair --rotate` to invalidate.',
      `  ${c.dim}closing the tab, or \`lf gateway pair --rotate\` to invalidate.${c.reset}`)
  row('', '')
  out(`${c.cyan}└${line}┘${c.reset}\n`)
  out('\n')
}

main().catch((err) => {
  const e = err as NodeJS.ErrnoException
  let hint = ''
  if (e.code === 'EPERM' || e.code === 'EACCES') {
    hint =
      '\n  Hint: a VPN, network extension, or OS firewall may be blocking the bind.' +
      '\n  Try a different port: LF_GATEWAY_PORT=38081 node dist/apps/gateway/main.js'
  } else if (e.code === 'EADDRINUSE') {
    hint =
      '\n  Hint: another process owns this port.' +
      '\n  Try: LF_GATEWAY_PORT=38081 node dist/apps/gateway/main.js'
  }
  process.stderr.write(`[lf-gatewayd] fatal: ${e.message}${hint}\n`)
  process.exit(1)
})
