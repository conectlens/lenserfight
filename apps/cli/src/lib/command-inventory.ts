import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { ArgDef, ArgsDef, CommandDef, CommandMeta, Resolvable } from 'citty'

import { currentScriptUrl } from './current-script-url'

/**
 * Top-level command names that warn as a side effect of being resolved
 * (deprecated aliases). Hardcoded rather than inferred from the warning
 * side effect so introspection never triggers it.
 */
export const DEPRECATED_TOP_LEVEL = new Set(['runner', 'agent'])

export interface CommandInventoryArgSpec {
  name: string
  type: 'boolean' | 'string' | 'enum' | 'positional'
  description?: string
  required?: boolean
  options?: string[]
}

export interface CommandInventoryEntry {
  /** Space-joined command path, e.g. "battle create". */
  name: string
  /** Path segments, e.g. ["battle", "create"]. */
  path: string[]
  description: string
  args: CommandInventoryArgSpec[]
  deprecated: boolean
  hasDoc: boolean
}

async function resolveCommand<T>(value: Resolvable<T> | undefined): Promise<T | undefined> {
  if (value === undefined) return undefined
  return typeof value === 'function' ? await (value as () => T | Promise<T>)() : await value
}

function toArgSpec(name: string, def: ArgDef): CommandInventoryArgSpec {
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

function docFileFor(topLevelName: string): string {
  const thisDir = dirname(fileURLToPath(currentScriptUrl))
  // apps/cli/src/lib/command-inventory.ts -> docs/en/reference/cli/<name>.md
  return resolve(thisDir, '../../../../docs/en/reference/cli', `${topLevelName}.md`)
}

async function walk(
  cmd: CommandDef<any>,
  pathSegments: string[],
  out: CommandInventoryEntry[],
): Promise<void> {
  const subCommands = await resolveCommand(cmd.subCommands)
  if (subCommands) {
    for (const [key, sub] of Object.entries(subCommands)) {
      const childPath = [...pathSegments, key]
      // Deprecated top-level aliases warn as a side effect of resolution — skip
      // resolving them entirely so introspection never triggers that warning.
      if (childPath.length === 1 && DEPRECATED_TOP_LEVEL.has(childPath[0])) {
        out.push({
          name: key,
          path: childPath,
          description: `Deprecated alias. See 'lf ${key === 'runner' ? 'lenser' : 'agents'} --help'.`,
          args: [],
          deprecated: true,
          hasDoc: existsSync(docFileFor(key)),
        })
        continue
      }
      const resolved = await resolveCommand(sub)
      if (resolved) await walk(resolved, childPath, out)
    }
  }

  if (cmd.run && pathSegments.length > 0) {
    const meta = (await resolveCommand(cmd.meta)) as CommandMeta | undefined
    const argsDef = ((await resolveCommand(cmd.args)) ?? {}) as ArgsDef
    out.push({
      name: pathSegments.join(' '),
      path: [...pathSegments],
      description: meta?.description ?? `lf ${pathSegments.join(' ')}`,
      args: Object.entries(argsDef).map(([name, def]) => toArgSpec(name, def)),
      deprecated: false,
      hasDoc: existsSync(docFileFor(pathSegments[0])),
    })
  }
}

/**
 * Walks the CLI's own command tree into a flat inventory. Single source of
 * truth for the TUI's command palette and the CSV audit harness — both
 * depend on this, not on each other or on main.ts directly.
 *
 * `main` is imported lazily (not at module scope) because importing it
 * evaluates main.ts, whose top-level side effect is `runMain(main)` — a real
 * CLI invocation against `process.argv`. In production that's harmless (see
 * the comment on `export const main` in main.ts: by the time anything calls
 * this function, main.ts has already fully evaluated via the real
 * entrypoint, so re-importing just hits the module cache). But any caller
 * that imports this file without going through that entrypoint first — e.g.
 * a test — must not trigger that side effect merely by importing this
 * module, only by actually calling this function.
 */
export async function buildCommandInventory(): Promise<CommandInventoryEntry[]> {
  const { main } = await import('../main')
  const out: CommandInventoryEntry[] = []
  await walk(main, [], out)
  return out
}
