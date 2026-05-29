import { defineCommand } from 'citty'
import consola from 'consola'
import {
  configExists,
  findConfigPath,
  loadConfig,
  saveConfig,
} from '../config/project-config'
import { c, sym } from '../utils/ansi'

type Mode = 'local' | 'cloud'

function currentModeInfo(): { mode: Mode; source: string } {
  if (process.env['LF_LOCAL'] === '1')
    return { mode: 'local', source: `env override (LF_LOCAL / --local)` }
  if (process.env['LF_CLOUD'] === '1')
    return { mode: 'cloud', source: `env override (LF_CLOUD / --cloud)` }
  if (configExists()) {
    const cfg = loadConfig()
    return { mode: cfg.mode, source: findConfigPath() }
  }
  return { mode: 'cloud', source: 'default (no project config — run `lf init` to create one)' }
}

function modeLabel(m: Mode): string {
  return m === 'local' ? c.localhost('local') : c.cloud('cloud')
}

export default defineCommand({
  meta: {
    name: 'use',
    description:
      'Show or persistently switch the active mode (local / cloud). Writes to .lenserfight/lenserfight.json.',
  },
  args: {
    mode: {
      type: 'positional',
      description: 'Mode to activate: local or cloud',
      required: false,
    },
    json: {
      type: 'boolean',
      description: 'Emit structured JSON (only for the no-arg status view)',
      default: false,
    },
  },
  async run({ args }) {
    // ── No argument — show current mode ───────────────────────────────────
    if (!args.mode) {
      const { mode, source } = currentModeInfo()

      if (args.json) {
        process.stdout.write(
          JSON.stringify({ mode, source, configPath: configExists() ? findConfigPath() : null }) + '\n',
        )
        return
      }

      const other: Mode = mode === 'local' ? 'cloud' : 'local'
      const sep = `  ${'─'.repeat(36)}`
      console.log(`\n${sep}`)
      console.log(`  ${sym.info}  Active mode   ${c.bold(modeLabel(mode))}`)
      console.log(`     Source        ${c.muted(source)}`)
      console.log(sep)
      console.log(`\n  Switch:  ${c.accent(`lf use ${other}`)}  ${c.muted('·')}  per-invocation: ${c.muted(`lf --${other} <cmd>`)}\n`)
      return
    }

    // ── Switch mode ────────────────────────────────────────────────────────
    const target = args.mode as string
    if (target !== 'local' && target !== 'cloud') {
      consola.error(`Unknown mode "${target}". Use ${c.accent('local')} or ${c.accent('cloud')}.`)
      process.exitCode = 1
      return
    }

    const m = target as Mode

    if (configExists()) {
      const current = loadConfig().mode
      if (current === m) {
        consola.info(`Already in ${modeLabel(m)} mode — nothing changed.`)
        consola.info(`Config: ${c.muted(findConfigPath())}`)
        return
      }
    }

    saveConfig({ mode: m })

    consola.success(`Switched to ${modeLabel(m)} mode.`)
    consola.info(`Config: ${c.muted(findConfigPath())}`)

    if (m === 'local') {
      consola.info(`Start local services:  ${c.accent('lf setup --mode local')}`)
      consola.info(`Override per-command:  ${c.muted('lf --local <cmd>')}`)
    } else {
      consola.info(`Authenticate:          ${c.accent('lf auth login')}`)
      consola.info(`Override per-command:  ${c.muted('lf --cloud <cmd>')}`)
    }
  },
})
