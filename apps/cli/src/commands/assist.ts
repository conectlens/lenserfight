import { spawn, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineCommand } from 'citty'
import consola from 'consola'

import { c } from '@lenserfight/cli-client'

import { isInteractiveTerminal } from '../lib/interactive-terminal'
import {
  buildLfConfig,
  isLfOnlyConfig,
  mergeLfConfig,
  type OpencodeConfig,
} from '../lib/opencode-config'
import { buildCliToolManifest } from '../lib/opencode-tool-bridge'

// `lf assist` (also the default when `lf`/`lenserfight` is run with no
// subcommand) — an interactive agent session pre-wired with every lf
// command as a tool, plus this project's MCP server config, when present.
// Built on the OpenCode runtime (https://github.com/anomalyco/opencode,
// MIT) — see NOTICE.md for attribution. See
// docs/en/tutorials/getting-started/cli-getting-started.md for details.

interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

function cliBinaryPath(): string {
  return fileURLToPath(import.meta.url)
}

function findPluginBundle(): string | null {
  const candidates = [
    // Published/installed layout (npm, npx, global install): lf-plugin.js
    // ships as a sibling of main.js — see apps/cli/project.json's
    // `copy-plugin` target and package.json's `files` array.
    resolve(dirname(cliBinaryPath()), 'lf-plugin.js'),
    // Monorepo dist layout: dist/apps/cli/main.js -> dist/libs/adapters/opencode-plugin/
    resolve(dirname(cliBinaryPath()), '../../libs/adapters/opencode-plugin/lf-plugin.js'),
    // Nx workspace dev layout, resolved from cwd.
    resolve(process.cwd(), 'dist/libs/adapters/opencode-plugin/lf-plugin.js'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/** Translates this project's .mcp.json (Claude Code's format) into the runtime's `mcp` config shape. */
function readMcpConfig(projectDir: string): Record<string, unknown> | null {
  const mcpJsonPath = resolve(projectDir, '.mcp.json')
  if (!existsSync(mcpJsonPath)) return null

  try {
    const parsed = JSON.parse(readFileSync(mcpJsonPath, 'utf8')) as {
      mcpServers?: Record<string, McpServerConfig>
    }
    const servers = parsed.mcpServers ?? {}
    const mcp: Record<string, unknown> = {}
    for (const [name, server] of Object.entries(servers)) {
      mcp[name] = {
        type: 'local',
        command: [server.command, ...(server.args ?? [])],
      }
    }
    return Object.keys(mcp).length > 0 ? mcp : null
  } catch {
    return null
  }
}

// On Windows, `opencode`/`npx` resolve to `.cmd` shims on PATH — spawn/spawnSync
// without shell:true issue a raw CreateProcess call that can't find them and
// fails with ENOENT. shell:true routes through cmd.exe (Node quotes args safely).
const isWindows = process.platform === 'win32'

function resolveAssistBinary(): { command: string; args: string[] } {
  // With shell:true a missing binary is cmd.exe's "not recognized" exit code, not
  // a spawn `error` — check the status too or Windows always picks `opencode`.
  const check = spawnSync('opencode', ['--version'], { stdio: 'ignore', shell: isWindows })
  if (!check.error && check.status === 0) return { command: 'opencode', args: [] }
  return { command: 'npx', args: ['--yes', 'opencode-ai'] }
}

export interface RunAssistOptions {
  force?: boolean
  passthroughArgs?: string[]
}

export async function runAssist(opts: RunAssistOptions = {}): Promise<void> {
  if (!isInteractiveTerminal()) {
    consola.error(
      'lf assist needs a real interactive terminal — it launches an OpenCode chat session that reads ' +
        "keyboard input and renders a live UI. It can't run inside a script, CI job, or an AI agent's " +
        'built-in command-execution terminal (it will hang on a blank screen instead of failing loudly).\n' +
        "Run it directly in Terminal.app, iTerm2, Warp, or another terminal you're typing into yourself.\n" +
        'To drive LenserFight non-interactively, use a specific subcommand instead (e.g. `lf lens run`, ' +
        '`lf battle create`) or the MCP server integration.',
    )
    process.exit(6)
  }

  const pluginPath = findPluginBundle()
  if (!pluginPath) {
    consola.error(
      'Assist runtime not built yet. Build it first:\n' + '  pnpm nx run adapters-opencode:bundle-plugin',
    )
    process.exit(4)
  }

  const projectDir = process.cwd()
  const opencodeDir = resolve(projectDir, '.opencode')
  const configPath = resolve(opencodeDir, 'opencode.json')
  const manifestPath = resolve(opencodeDir, 'lf-cli-tools-manifest.json')

  // The config is a generated artifact, so an existing one must never block the
  // session — that made `lf` unusable from any directory it had already run in.
  // Ours is refreshed in place; anyone else's is merged into, never clobbered.
  let existing: OpencodeConfig | null = null
  if (existsSync(configPath) && !opts.force) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      existing = parsed as OpencodeConfig
    } catch {
      consola.error(
        `${configPath} is not a valid OpenCode config (unreadable JSON). Fix or delete it, or re-run ` +
          'with --force to regenerate it from scratch.',
      )
      process.exit(5)
    }
  }

  mkdirSync(opencodeDir, { recursive: true })

  const tools = await buildCliToolManifest()
  writeFileSync(manifestPath, JSON.stringify({ cliBinaryPath: cliBinaryPath(), tools }, null, 2) + '\n')

  const mcp = readMcpConfig(projectDir)
  const foreign = existing && !isLfOnlyConfig(existing) ? existing : null
  if (foreign) {
    // Keep one copy of what they had before we first touched it, and say so once —
    // every later run is steady state and should stay quiet.
    const backupPath = `${configPath}.lf-backup`
    if (!existsSync(backupPath)) {
      writeFileSync(backupPath, readFileSync(configPath, 'utf8'))
      consola.warn(
        `${configPath} was not generated by lf — adding the LenserFight plugin to it and leaving the ` +
          `rest intact (original saved to ${backupPath}). Use --force to replace it entirely.`,
      )
    }
  }
  const config = foreign ? mergeLfConfig(foreign, pluginPath, mcp) : buildLfConfig(pluginPath, mcp)
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  consola.info(
    `${c.brandGold('LenserFight')} assist ready — lens run, battle create, and ${tools.length} other lf ` +
      `command(s) available as tools${mcp ? ', mcp: ' + Object.keys(mcp).join(', ') : ''}. Destructive ` +
      'commands (kill-switch, dark-launch, db reset, etc) keep their existing --confirm gate — review ' +
      'what the agent does before trusting it.',
  )

  const { command, args: prefixArgs } = resolveAssistBinary()
  const child = spawn(command, [...prefixArgs, ...(opts.passthroughArgs ?? [])], {
    stdio: 'inherit',
    cwd: projectDir,
    env: { ...process.env, LF_OPENCODE_MANIFEST_PATH: manifestPath },
    shell: isWindows,
  })
  await new Promise<void>((resolvePromise) => {
    // A spawn failure (runtime missing, npx unavailable) emits 'error' and never
    // 'exit' — without this handler the CLI waits on that promise forever.
    child.on('error', (err) => {
      consola.error(
        `Could not launch the assist runtime via '${command}': ${err.message}\n` +
          'Install it once with `npm install -g opencode-ai`, then re-run `lf assist`.',
      )
      process.exitCode = 7
      resolvePromise()
    })
    child.on('exit', (code) => {
      process.exitCode = code ?? 0
      resolvePromise()
    })
  })
}

export default defineCommand({
  meta: {
    name: 'assist',
    description: 'Launch an interactive agent session with every lf command available as a tool.',
  },
  args: {
    force: {
      type: 'boolean',
      default: false,
      description: 'Replace .opencode/opencode.json entirely instead of updating it in place.',
    },
  },
  async run({ args, rawArgs }) {
    await runAssist({ force: Boolean(args.force), passthroughArgs: rawArgs.filter((a) => a !== '--force') })
  },
})
