import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { tool } from '@opencode-ai/plugin'

import type { OpencodeToolAdapterV1, OpencodeToolMetadata } from './opencode-tool-adapter'

// See lens-adapter.ts — args must be built off `tool.schema`, not this
// repo's top-level `zod` import (structurally incompatible zod instances).
const z = tool.schema

const execFileAsync = promisify(execFile)

/** Hard ceiling so a command this bridge misclassified as request/response
 * (a daemon, an interactive prompt) fails safely instead of hanging the
 * OpenCode host process forever. See CLI_TOOL_DENYLIST in apps/cli's
 * opencode-tool-bridge.ts for the primary (best-effort) exclusion. */
const EXECUTE_TIMEOUT_MS = 60_000
const MAX_BUFFER_BYTES = 5 * 1024 * 1024

export interface CliToolArgSpec {
  name: string
  type: 'boolean' | 'string' | 'enum' | 'positional'
  description?: string
  required?: boolean
  options?: string[]
}

export interface CliToolManifestEntry {
  id: string
  description: string
  commandPath: string[]
  args: CliToolArgSpec[]
}

export interface CliToolManifest {
  cliBinaryPath: string
  tools: CliToolManifestEntry[]
}

function argSpecToZodField(spec: CliToolArgSpec) {
  const base =
    spec.type === 'boolean'
      ? z.boolean()
      : spec.type === 'enum' && spec.options && spec.options.length > 0
        ? z.enum(spec.options as [string, ...string[]])
        : z.string()
  const described = base.describe(spec.description ?? spec.name)
  return spec.required ? described : described.optional()
}

/** Converts LLM-supplied args back into argv for the real `lf` binary — always
 * an array handed to execFile (never a shell string), so no flag/positional
 * value can break out into shell injection regardless of its content. */
function buildArgv(entry: CliToolManifestEntry, rawArgs: Record<string, unknown>): string[] {
  const positionals: string[] = []
  const flags: string[] = []
  for (const spec of entry.args) {
    const value = rawArgs[spec.name]
    if (value === undefined || value === null || value === '') continue
    if (spec.type === 'positional') {
      positionals.push(String(value))
    } else if (spec.type === 'boolean') {
      if (value) flags.push(`--${spec.name}`)
    } else {
      flags.push(`--${spec.name}`, String(value))
    }
  }
  return [...entry.commandPath, ...positionals, ...flags]
}

/**
 * Generic bridge: wraps one CLI command (any leaf in apps/cli's citty
 * command tree — see apps/cli/src/lib/opencode-tool-bridge.ts) as an
 * OpenCode tool by shelling out to the real `lf` binary via `execFile`
 * (never in-process). This is deliberate, not just convenient — several
 * command handlers call `process.exit()` on error, which would kill the
 * whole OpenCode host if invoked in-process. A child process dying only
 * ends that one tool call, and every command keeps its existing
 * --confirm/assertSafe gate exactly as it behaves from a real terminal,
 * since this runs the literal same binary a human would.
 */
export function createCliBridgeAdapter(entry: CliToolManifestEntry, cliBinaryPath: string): OpencodeToolAdapterV1 {
  const metadata: OpencodeToolMetadata = {
    description: entry.description,
    mirrorsMcpTool: `lf ${entry.commandPath.join(' ')}`,
  }

  const argsSchema: Record<string, ReturnType<typeof argSpecToZodField>> = {}
  for (const spec of entry.args) argsSchema[spec.name] = argSpecToZodField(spec)

  return {
    id: () => entry.id,
    metadata: () => metadata,
    toToolDefinition: () =>
      tool({
        description: `Runs \`lf ${entry.commandPath.join(' ')}\`. ${entry.description}`,
        args: argsSchema,
        async execute(rawArgs) {
          const argv = buildArgv(entry, rawArgs as Record<string, unknown>)
          const label = `lf ${argv.join(' ')}`
          try {
            const { stdout, stderr } = await execFileAsync(process.execPath, [cliBinaryPath, ...argv], {
              timeout: EXECUTE_TIMEOUT_MS,
              maxBuffer: MAX_BUFFER_BYTES,
            })
            return { title: label, output: stdout || stderr || '(no output)' }
          } catch (err) {
            const e = err as { stderr?: string; message: string; killed?: boolean; signal?: string }
            if (e.killed || e.signal === 'SIGTERM') {
              return `${label} timed out after ${EXECUTE_TIMEOUT_MS / 1000}s and was killed.`
            }
            return `${label} failed: ${e.stderr || e.message}`
          }
        },
      }),
  }
}
