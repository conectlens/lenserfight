import { promises as fsp } from 'node:fs'
import { existsSync, mkdirSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { defineCommand } from 'citty'
import consola from 'consola'
import { handleError } from '../utils/api'

// ─── Top-level subcommand list ───────────────────────────────────────────────
//
// Citty doesn't expose a stable introspection API, so we keep this list in
// sync with main.ts manually. Per-subcommand flag completion is out of scope
// for this milestone — top-level + first-arg completion only.

const TOP_LEVEL_COMMANDS = [
  'admin',
  'agent',          // deprecated alias for 'lenser'
  'ai',
  'analytics',
  'approval',
  'auth',
  'automation',
  'battle',
  'battle-moderation',
  'budget',
  'byok',
  'communities',
  'completion',
  'config',
  'connect',
  'connectors',
  'dark-launch',
  'dev',
  'doctor',
  'docs',
  'env',
  'evaluate',
  'examples',
  'execution',
  'export',
  'feed',
  'gateway',
  'import',
  'init',
  'inspect',
  'invite',
  'keys',
  'kill-switch',
  'leaderboard',
  'lens',
  'lenser',
  'lenses',
  'local-battle-key',
  'media',
  'memory',
  'migrate-terminology',
  'models',
  'onboard',
  'policy',
  'profile',
  'providers',
  'publish',
  'report',
  'reset',
  'rubric',
  'run',
  'runner',         // deprecated alias for 'lenser'
  'schedule',
  'security',
  'seed',
  'setup',
  'spec',
  'status',
  'tag',
  'team',
  'template',
  'tool',
  'top',
  'update',
  'validate',
  'webhook-secret',
  'whats-new',
  'workflow',
]

const SENTINEL = '# lenserfight-completion'

// ─── Script generators ───────────────────────────────────────────────────────

function bashScript(): string {
  const cmds = TOP_LEVEL_COMMANDS.join(' ')
  return `${SENTINEL}
_lf() {
  local cur prev
  COMPREPLY=()
  cur="\${COMP_WORDS[COMP_CWORD]}"
  prev="\${COMP_WORDS[COMP_CWORD-1]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "${cmds}" -- "$cur") )
    return 0
  fi
  return 0
}
complete -F _lf lf
complete -F _lf lenserfight
`
}

function zshScript(): string {
  const cmds = TOP_LEVEL_COMMANDS.join(' ')
  return `${SENTINEL}
_lf() {
  local -a cmds
  cmds=(${cmds})
  if (( CURRENT == 2 )); then
    _describe 'command' cmds
    return
  fi
}
compdef _lf lf
compdef _lf lenserfight
`
}

function fishScript(): string {
  return `${SENTINEL}
${TOP_LEVEL_COMMANDS.map((c) => `complete -c lf -n "__fish_use_subcommand" -a "${c}"`).join('\n')}
${TOP_LEVEL_COMMANDS.map((c) => `complete -c lenserfight -n "__fish_use_subcommand" -a "${c}"`).join('\n')}
`
}

// ─── Shell detection ─────────────────────────────────────────────────────────

type Shell = 'bash' | 'zsh' | 'fish'

function detectShell(): Shell | null {
  const sh = process.env['SHELL'] ?? ''
  if (sh.endsWith('/zsh') || sh.endsWith('zsh')) return 'zsh'
  if (sh.endsWith('/bash') || sh.endsWith('bash')) return 'bash'
  if (sh.endsWith('/fish') || sh.endsWith('fish')) return 'fish'
  return null
}

function rcPathForShell(shell: Shell): string {
  const home = os.homedir()
  if (shell === 'bash') return path.join(home, '.bashrc')
  if (shell === 'zsh') return path.join(home, '.zshrc')
  return path.join(home, '.config', 'fish', 'completions', 'lf.fish')
}

function scriptForShell(shell: Shell): string {
  if (shell === 'bash') return bashScript()
  if (shell === 'zsh') return zshScript()
  return fishScript()
}

// ─── Subcommands ─────────────────────────────────────────────────────────────

const completionBash = defineCommand({
  meta: { name: 'bash', description: 'Print bash completion script to stdout.' },
  async run() {
    process.stdout.write(bashScript())
  },
})

const completionZsh = defineCommand({
  meta: { name: 'zsh', description: 'Print zsh completion script to stdout.' },
  async run() {
    process.stdout.write(zshScript())
  },
})

const completionFish = defineCommand({
  meta: { name: 'fish', description: 'Print fish completion script to stdout.' },
  async run() {
    process.stdout.write(fishScript())
  },
})

const completionInstall = defineCommand({
  meta: {
    name: 'install',
    description: 'Install the completion script into the appropriate shell rc file (idempotent).',
  },
  args: {
    shell: {
      type: 'string',
      description: 'auto | bash | zsh | fish',
      default: 'auto',
    },
    force: {
      type: 'boolean',
      description: 'Re-install even if the sentinel comment is already present',
      default: false,
    },
  },
  async run({ args }) {
    try {
      let shell: Shell | null
      if (args.shell === 'auto') {
        shell = detectShell()
        if (!shell) {
          consola.error('Could not detect $SHELL. Pass --shell bash|zsh|fish.')
          process.exitCode = 1
          return
        }
      } else if (args.shell === 'bash' || args.shell === 'zsh' || args.shell === 'fish') {
        shell = args.shell
      } else {
        consola.error('Invalid --shell "%s". Allowed: auto, bash, zsh, fish.', args.shell)
        process.exitCode = 1
        return
      }

      const rcPath = rcPathForShell(shell)
      const script = scriptForShell(shell)

      // Fish writes a dedicated completion file; for bash/zsh we append to rc.
      if (shell === 'fish') {
        const dir = path.dirname(rcPath)
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
        if (existsSync(rcPath) && !args.force) {
          const existing = await fsp.readFile(rcPath, 'utf-8')
          if (existing.includes(SENTINEL)) {
            consola.info('lf completion already installed at %s (sentinel found). Pass --force to overwrite.', rcPath)
            return
          }
        }
        await fsp.writeFile(rcPath, script)
        consola.success('Installed fish completions to %s.', rcPath)
        return
      }

      // bash/zsh: append-once with a sentinel guard.
      const existing = existsSync(rcPath) ? await fsp.readFile(rcPath, 'utf-8') : ''
      if (existing.includes(SENTINEL) && !args.force) {
        consola.info('lf completion already installed in %s. Pass --force to re-append.', rcPath)
        return
      }
      const block = '\n' + script + '\n'
      await fsp.writeFile(rcPath, existing + block)
      consola.success('Appended lf completion to %s.', rcPath)
      consola.info('Reload your shell or run: source %s', rcPath)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ──────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'completion',
    description: 'Generate or install shell completion scripts for `lf`.',
  },
  subCommands: {
    bash: completionBash,
    zsh: completionZsh,
    fish: completionFish,
    install: completionInstall,
  },
})
