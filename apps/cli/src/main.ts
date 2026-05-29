import { defineCommand, runMain } from 'citty'
import consola from 'consola'
import { setExecContext, getExecContext } from './lib/exec-context'
import { readCliVersion } from './lib/version'

// Parse --local and --debug before citty takes over so they activate even
// when placed after the subcommand name (e.g. `lf cmd --local`).
function parseGlobalFlagsEarly(): void {
  const argv = process.argv.slice(2)
  if (argv.includes('--local')) process.env['LF_LOCAL'] = '1'
  if (argv.includes('--cloud')) process.env['LF_CLOUD'] = '1'
  if (argv.includes('--debug')) process.env['LF_DEBUG'] = '1'
}
parseGlobalFlagsEarly()

// Deprecated aliases — warn and delegate to the canonical `lenser` command.
const runnerDeprecatedCommand = () =>
  import('./commands/lenser').then((m) => {
    consola.warn("'runner' is deprecated. Use 'lenser' instead.")
    return m.default
  })

const agentDeprecatedCommand = () =>
  import('./commands/lenser').then((m) => {
    consola.warn("'agent' is deprecated. Use 'lenser' instead.")
    return m.default
  })

// Default action: `lf` with no subcommand opens the interactive TUI dashboard.
// citty parses --help before run() fires, so `lf --help` still prints help.
async function defaultRun(ctx: { rawArgs?: string[] }) {
  const raw = ctx.rawArgs ?? []
  if (raw.length > 0) return // citty will hand off to a subcommand
  const { runDashboard } = await import('./tui/dashboard')
  await runDashboard()
}

const main = defineCommand({
  meta: {
    name: 'lenserfight',
    version: readCliVersion(),
    description: 'LenserFight CLI — manage lenses, battles, agents, workflows, and local dev.',
  },
  args: {
    local: {
      type: 'boolean',
      description: 'Override project config mode to local for this invocation',
      default: false,
    },
    cloud: {
      type: 'boolean',
      description: 'Override project config mode to cloud for this invocation',
      default: false,
    },
    debug: {
      type: 'boolean',
      description: 'Enable verbose debug diagnostics on stderr',
      default: false,
    },
  },
  async run(ctx) {
    // Also set env vars from citty-parsed root args (handles `lf --local cmd`)
    if (ctx.args.local) process.env['LF_LOCAL'] = '1'
    if (ctx.args.cloud) process.env['LF_CLOUD'] = '1'
    if (ctx.args.debug) process.env['LF_DEBUG'] = '1'

    const isLocal = process.env['LF_LOCAL'] === '1'
    const isDebug = process.env['LF_DEBUG'] === '1'
    setExecContext({ isLocal, isDebug })

    if (isDebug) consola.level = 4
    if (isLocal) process.stderr.write('local mode active\n')

    await defaultRun(ctx)
  },
  subCommands: {
    init: () => import('./commands/init').then((m) => m.default),
    doctor: () => import('./commands/doctor').then((m) => m.default),
    db: () => import('./commands/db').then((m) => m.default),
    status: () => import('./commands/status').then((m) => m.default),
    validate: () => import('./commands/validate').then((m) => m.default),
    spec: () => import('./commands/spec').then((m) => m.default),
    'migrate-terminology': () => import('./commands/migrate-terminology').then((m) => m.default),
    import: () => import('./commands/import').then((m) => m.default),
    export: () => import('./commands/export').then((m) => m.default),
    auth: () => import('./commands/auth').then((m) => m.default),
    config: () => import('./commands/config').then((m) => m.default),
    'local-battle-key': () => import('./commands/config-local-battle-key').then((m) => m.default),
    'webhook-secret': () => import('./commands/config-webhook-secret').then((m) => m.default),
    setup: () => import('./commands/setup').then((m) => m.default),
    onboard: () => import('./commands/onboard').then((m) => m.default),
    runner: runnerDeprecatedCommand,
    agent: agentDeprecatedCommand,
    inspect: () => import('./commands/inspect').then((m) => m.default),
    battle: () => import('./commands/battle').then((m) => m.default),
    'battle-moderation': () => import('./commands/battle-moderation').then((m) => m.default),
    run: () => import('./commands/run').then((m) => m.default),
    workflow: () => import('./commands/workflow').then((m) => m.default),
    evaluate: () => import('./commands/evaluate').then((m) => m.default),
    tool: () => import('./commands/tool').then((m) => m.default),
    memory: () => import('./commands/memory').then((m) => m.default),
    publish: () => import('./commands/publish').then((m) => m.default),
    rubric: () => import('./commands/rubric').then((m) => m.default),
    template: () => import('./commands/template').then((m) => m.default),
    lens: () => import('./commands/lens').then((m) => m.default),
    lenses: () => import('./commands/lenses').then((m) => m.default),
    communities: () => import('./commands/communities').then((m) => m.default),
    connectors: () => import('./commands/connectors').then((m) => m.default),
    connect: () => import('./commands/connect').then((m) => m.default),
    invite: () => import('./commands/invite').then((m) => m.default),
    lenser: () => import('./commands/lenser').then((m) => m.default),
    providers: () => import('./commands/providers').then((m) => m.default),
    models: () => import('./commands/models').then((m) => m.default),
    gateway: () => import('./commands/gateway').then((m) => m.default),
    ai: () => import('./commands/ai').then((m) => m.default),
    analytics: () => import('./commands/analytics').then((m) => m.default),
    tag: () => import('./commands/tag').then((m) => m.default),
    feed: () => import('./commands/feed').then((m) => m.default),
    leaderboard: () => import('./commands/leaderboard').then((m) => m.default),
    report: () => import('./commands/report').then((m) => m.default),
    team: () => import('./commands/team').then((m) => m.default),
    schedule: () => import('./commands/schedule').then((m) => m.default),
    automation: () => import('./commands/automation').then((m) => m.default),
    approval: () => import('./commands/approval').then((m) => m.default),
    execution: () => import('./commands/execution').then((m) => m.default),
    'kill-switch': () => import('./commands/kill-switch').then((m) => m.default),
    'dark-launch': () => import('./commands/dark-launch').then((m) => m.default),
    budget: () => import('./commands/budget').then((m) => m.default),
    platform: () => import('./commands/platform').then((m) => m.default),
    policy: () => import('./commands/policy').then((m) => m.default),
    completion: () => import('./commands/completion').then((m) => m.default),
    profile: () => import('./commands/profile').then((m) => m.default),
    'whats-new': () => import('./commands/whats-new').then((m) => m.default),
    top: () => import('./commands/top').then((m) => m.default),
    media: () => import('./commands/media').then((m) => m.default),
    byok: () => import('./commands/byok').then((m) => m.default),
    keys: () => import('./commands/keys').then((m) => m.default),
    security: () => import('./commands/security').then((m) => m.default),
    admin: () => import('./commands/admin').then((m) => m.default),
    update: () => import('./commands/update').then((m) => m.default),
    examples: () => import('./commands/examples').then((m) => m.default),
    env: () => import('./commands/env').then((m) => m.default),
    docs: () => import('./commands/docs').then((m) => m.default),
  },
})

runMain(main)

// Background update-check: runs after the command completes, never blocks.
// Prints a one-line hint to stderr so it never pollutes stdout/JSON output.
process.on('exit', () => {
  const { isDebug, commandStartMs } = getExecContext()
  if (isDebug) process.stderr.write(`done in ${Date.now() - commandStartMs}ms\n`)
})

// Fire-and-forget: scheduled after event loop yields so it never delays startup.
setImmediate(() => {
  // Skip the hint when the user is already running `lf update`
  const subcommand = process.argv[2]
  if (subcommand === 'update') return

  import('@lenserfight/utils/update-check')
    .then(({ checkForUpdate, isNewer }) => {
      const current = readCliVersion()
      checkForUpdate(current)
        .then((result) => {
          if (result?.hasUpdate && isNewer(result.current, result.latest)) {
            process.stderr.write(
              `\n  ╭─────────────────────────────────────────────────────╮\n` +
                `  │  Update available: v${result.current} → v${result.latest.padEnd(Math.max(0, result.current.length))}  │\n` +
                `  │  Run \`lf update\` for upgrade instructions.           │\n` +
                `  ╰─────────────────────────────────────────────────────╯\n\n`
            )
          }
        })
        .catch(() => {
          // fire-and-forget — never surface update-check errors
        })
    })
    .catch(() => {
      // module load failure is non-fatal
    })
})
