import { defineCommand } from 'citty'
import consola from 'consola'
import {
  findConfigPath,
  getEffectiveMode,
  getUserPreferencesPath,
  projectConfigExists,
  readProjectConfigAt,
  saveConfig,
  saveUserPreferences,
} from '../config/project-config'
import { c, sym } from '../utils/ansi'

type Mode = 'local' | 'cloud'

/** Canonical file for `lf use` / runtime mode (OS user config dir). */
function modeConfigPath(): string {
  return getUserPreferencesPath()
}

function currentModeInfo(): { mode: Mode; source: string } {
  const { mode, source } = getEffectiveMode()
  const sourceLabel =
    source === 'env-local'
      ? 'env override (LF_LOCAL / --local)'
      : source === 'env-cloud'
        ? 'env override (LF_CLOUD / --cloud)'
        : source === 'user'
          ? modeConfigPath()
          : source === 'project'
            ? `${findConfigPath()} (legacy — run lf init to migrate mode to user config)`
            : 'default (run `lf init` to create user config)'
  return { mode, source: sourceLabel }
}

function modeLabel(m: Mode): string {
  return m === 'local' ? c.localhost('Supabase local') : c.cloud('Cloud')
}

function warnStaleProjectMode(requested: Mode): void {
  if (!projectConfigExists()) return
  try {
    const projectMode = readProjectConfigAt().mode
    if (projectMode !== requested) {
      consola.warn(
        'Project file %s still has mode=%s; ignored. Active mode is stored only in %s',
        findConfigPath(),
        projectMode,
        modeConfigPath(),
      )
    }
  } catch {
    // non-fatal
  }
}

export default defineCommand({
  meta: {
    name: 'use',
    description:
      'Show or switch runtime mode (local / cloud). Always persists to your OS user config (single source of truth). Use --project to also update a repo-local .lenserfight/ file.',
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
    project: {
      type: 'boolean',
      description: 'Also write mode to .lenserfight/lenserfight.json in the current directory',
      default: false,
    },
  },
  async run({ args }) {
    // ── No argument — show current mode ───────────────────────────────────
    if (!args.mode) {
      const { mode, source } = currentModeInfo()

      if (args.json) {
        process.stdout.write(
          JSON.stringify({
            mode,
            source,
            configPath: modeConfigPath(),
            projectConfigPath: projectConfigExists() ? findConfigPath() : null,
          }) + '\n',
        )
        return
      }

      const other: Mode = mode === 'local' ? 'cloud' : 'local'
      const sep = `  ${'─'.repeat(36)}`
      console.log(`\n${sep}`)
      console.log(`  ${sym.info}  Active mode   ${c.bold(modeLabel(mode))}`)
      console.log(`     Source        ${c.muted(source)}`)
      console.log(sep)
      console.log(`  File workspace  ${c.success('always on')}  ${c.muted('(lf battle file, lf validate — no Docker)')}`)
      console.log(`\n  Switch API:  ${c.accent(`lf use ${other}`)}  ${c.muted('·')}  once: ${c.muted(`lf --${other} <cmd>`)}\n`)
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
    const { mode: current } = getEffectiveMode()

    if (current === m) {
      consola.info(`Already in ${modeLabel(m)} mode — nothing changed.`)
      consola.info(`Config: ${c.muted(modeConfigPath())}`)
      return
    }

    saveUserPreferences({ mode: m })

    if (args.project && projectConfigExists()) {
      saveConfig({ mode: m })
      consola.info(`Also updated project file: ${c.muted(findConfigPath())}`)
    } else if (args.project) {
      saveConfig({ mode: m })
      consola.info(`Also created project file: ${c.muted(findConfigPath())}`)
    } else {
      warnStaleProjectMode(m)
    }

    consola.success(`Switched to ${modeLabel(m)} mode.`)
    consola.info(`Config: ${c.muted(modeConfigPath())}`)

    if (m === 'local') {
      consola.info(`Start local services:  ${c.accent('lf setup --mode local')}`)
      consola.info(`Override per-command:  ${c.muted('lf --local <cmd>')}`)
    } else {
      consola.info(`Authenticate:          ${c.accent('lf auth login')}`)
      consola.info(`Override per-command:  ${c.muted('lf --cloud <cmd>')}`)
    }
  },
})
