import type { ArgDef, ArgsDef, CommandDef, CommandMeta, Resolvable } from 'citty'

import { main } from '../main'

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

/**
 * Commands that cannot be represented as a single request/response tool call
 * (long-running daemons, interactive wizards) or that would be redundant/
 * nonsensical as an OpenCode tool (deprecated aliases, `opencode` itself).
 * This is a best-effort denylist based on known behavior, not an exhaustive
 * per-command audit — createCliBridgeAdapter's execute() also enforces a
 * hard timeout so anything missed here fails safely instead of hanging the
 * OpenCode host process.
 */
export const CLI_TOOL_DENYLIST = new Set<string>([
  'gateway serve',
  'onboard',
  'setup',
  'runner', // deprecated alias for `lenser`
  'agent', // deprecated alias for `agents`
  'opencode', // avoid a tool that re-invokes this same bridge
])

async function resolve<T>(value: Resolvable<T> | undefined): Promise<T | undefined> {
  if (value === undefined) return undefined
  return typeof value === 'function' ? await (value as () => T | Promise<T>)() : await value
}

function toArgSpec(name: string, def: ArgDef): CliToolArgSpec {
  const description = 'description' in def ? def.description : undefined
  if (def.type === 'positional') {
    return { name, type: 'positional', description, required: def.required ?? false }
  }
  if (def.type === 'enum') {
    return { name, type: 'enum', description, options: def.options ?? [] }
  }
  if (def.type === 'boolean') {
    return { name, type: 'boolean', description }
  }
  return { name, type: 'string', description, required: def.required ?? false }
}

async function walk(cmd: CommandDef<any>, pathSegments: string[], out: CliToolManifestEntry[]): Promise<void> {
  const pathKey = pathSegments.join(' ')
  if (CLI_TOOL_DENYLIST.has(pathKey)) return

  const subCommands = await resolve(cmd.subCommands)
  if (subCommands) {
    for (const [key, sub] of Object.entries(subCommands)) {
      const childPath = [...pathSegments, key]
      // Skip resolving denylisted subcommands entirely — some (the
      // deprecated `runner`/`agent` aliases) warn as a side effect of being
      // resolved, which we don't want to trigger just for introspection.
      if (CLI_TOOL_DENYLIST.has(childPath.join(' '))) continue
      const resolved = await resolve(sub)
      if (resolved) await walk(resolved, childPath, out)
    }
  }

  if (cmd.run && pathSegments.length > 0) {
    const meta = (await resolve(cmd.meta)) as CommandMeta | undefined
    const argsDef = ((await resolve(cmd.args)) ?? {}) as ArgsDef
    out.push({
      id: `lf_${pathSegments.join('_').replace(/-/g, '_')}`,
      description: meta?.description ?? `lf ${pathSegments.join(' ')}`,
      commandPath: [...pathSegments],
      args: Object.entries(argsDef).map(([name, def]) => toArgSpec(name, def)),
    })
  }
}

/** Walks the CLI's own command tree (already-evaluated, in-process — see main.ts) into a flat tool manifest. */
export async function buildCliToolManifest(): Promise<CliToolManifestEntry[]> {
  const out: CliToolManifestEntry[] = []
  await walk(main, [], out)
  return out
}
