import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineCommand } from 'citty'
import consola from 'consola'

import { c, resolveConfig } from '@lenserfight/cli-client'

import { isInteractiveTerminal } from '../lib/interactive-terminal'
import { buildLfConfig, mergeLfConfig, type AssistConfig } from '../lib/lf-assist-config'
import { buildCliToolManifest } from '../lib/cli-tool-bridge'

// `lf assist` (also the default when `lf`/`lenserfight` is run with no
// subcommand) — an interactive agent session pre-wired with every lf
// command as a tool, plus this project's MCP server config, when present.
// Built on a LenserFight fork of the OpenCode runtime
// (https://github.com/anomalyco/opencode, MIT) — see NOTICE.md for
// attribution and vendor/opencode/SOURCE.md for fork details. See
// docs/en/tutorials/getting-started/cli-getting-started.md for details.

interface McpServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
}

function cliBinaryPath(): string {
  return fileURLToPath(import.meta.url)
}

/** Locates the bundled, LenserFight-branded assist runtime (a fork of
 * OpenCode with `lf`'s commands baked in natively — see
 * vendor/opencode/SOURCE.md) rather than any publicly installed `opencode`. */
function findAssistBinary(): string | null {
  const candidates = [
    // Published/installed layout (npm, npx, global install): lf-assist
    // ships as a sibling of main.js — see apps/cli/project.json's `build`
    // target and package.json's `files` array.
    resolve(dirname(cliBinaryPath()), 'lf-assist'),
    // Nx workspace dev layout, resolved from cwd.
    resolve(process.cwd(), 'dist/apps/cli/lf-assist'),
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

export interface RunAssistOptions {
  force?: boolean
  passthroughArgs?: string[]
}

export async function runAssist(opts: RunAssistOptions = {}): Promise<void> {
  if (!isInteractiveTerminal()) {
    consola.error(
      'lf assist needs a real interactive terminal — it launches an agent chat session that reads ' +
        "keyboard input and renders a live UI. It can't run inside a script, CI job, or an AI agent's " +
        'built-in command-execution terminal (it will hang on a blank screen instead of failing loudly).\n' +
        "Run it directly in Terminal.app, iTerm2, Warp, or another terminal you're typing into yourself.\n" +
        'To drive LenserFight non-interactively, use a specific subcommand instead (e.g. `lf lens run`, ' +
        '`lf battle create`) or the MCP server integration.',
    )
    process.exit(6)
  }

  // The fork no longer offers OpenCode's own hosted "opencode" provider
  // (console.opencode.ai OAuth + billing) — LenserFight's own auth gates
  // the session instead, same as every other authenticated lf command.
  const lfConfig = resolveConfig()
  if (!lfConfig.apiKey && !lfConfig.developerToken && !lfConfig.authToken) {
    consola.error('Authentication required. Run `lf auth login` or set LENSERFIGHT_API_KEY.')
    process.exit(8)
  }

  const assistBinary = findAssistBinary()
  if (!assistBinary) {
    consola.error('Assist runtime not built yet. Build it first:\n' + '  pnpm nx run cli:build')
    process.exit(4)
  }

  const projectDir = process.cwd()
  const lenserfightDir = resolve(projectDir, '.lenserfight')
  const configPath = resolve(lenserfightDir, 'lenserfight.json')
  const manifestPath = resolve(lenserfightDir, 'lf-cli-tools-manifest.json')

  // The config is a generated artifact, so an existing one must never block the
  // session — that made `lf` unusable from any directory it had already run in.
  let existing: AssistConfig | null = null
  if (existsSync(configPath) && !opts.force) {
    try {
      const parsed = JSON.parse(readFileSync(configPath, 'utf8')) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object')
      existing = parsed as AssistConfig
    } catch {
      consola.error(
        `${configPath} is not a valid config (unreadable JSON). Fix or delete it, or re-run ` +
          'with --force to regenerate it from scratch.',
      )
      process.exit(5)
    }
  }

  mkdirSync(lenserfightDir, { recursive: true })

  const tools = await buildCliToolManifest()
  writeFileSync(manifestPath, JSON.stringify({ cliBinaryPath: cliBinaryPath(), tools }, null, 2) + '\n')

  // lf's own commands ship natively inside the assist runtime — this config
  // only ever carries this project's mcp server config, merged additively
  // into whatever's already there (the user's own entries win on collision).
  const mcp = readMcpConfig(projectDir)
  const config = existing ? mergeLfConfig(existing, mcp) : buildLfConfig(mcp)
  if (config) writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  consola.info(
    `${c.brandGold('LenserFight')} assist ready — lens run, battle create, and ${tools.length} other lf ` +
      `command(s) available as tools${mcp ? ', mcp: ' + Object.keys(mcp).join(', ') : ''}. Destructive ` +
      'commands (kill-switch, dark-launch, db reset, etc) keep their existing --confirm gate — review ' +
      'what the agent does before trusting it.',
  )

  const child = spawn(assistBinary, opts.passthroughArgs ?? [], {
    stdio: 'inherit',
    cwd: projectDir,
    env: { ...process.env, LF_ASSIST_MANIFEST_PATH: manifestPath },
  })
  await new Promise<void>((resolvePromise) => {
    // A spawn failure emits 'error' and never 'exit' — without this handler
    // the CLI waits on that promise forever.
    child.on('error', (err) => {
      consola.error(
        `Could not launch the bundled assist runtime: ${err.message}\n` +
          'Try reinstalling @lenserfight/cli, or rebuild it with `pnpm nx run cli:build`.',
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
      description: 'Replace .lenserfight/lenserfight.json entirely instead of updating it in place.',
    },
  },
  async run({ args, rawArgs }) {
    await runAssist({ force: Boolean(args.force), passthroughArgs: rawArgs.filter((a) => a !== '--force') })
  },
})
