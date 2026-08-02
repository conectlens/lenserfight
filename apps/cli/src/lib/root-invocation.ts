/**
 * Decides what a bare `lf` invocation should do.
 *
 * citty dispatches the first *non-flag* token in rawArgs as a subcommand and
 * then still calls the root command's `run()`. So the root handler cannot key
 * off `rawArgs.length` to detect "no subcommand" — that treats `lf --force` and
 * `lf --local` as if a subcommand had run, and the CLI exits silently having
 * done nothing.
 */

/** Flags consumed by the root command itself; never forwarded to the assist runtime. */
const ROOT_FLAGS = new Set(['--local', '--cloud', '--debug', '--force'])

export interface RootInvocation {
  /** True when no subcommand was dispatched, so the default assist session should launch. */
  launchAssist: boolean
  force: boolean
  /** Remaining args to hand to the assist runtime, with root-owned flags stripped. */
  passthroughArgs: string[]
}

export function resolveRootInvocation(rawArgs: readonly string[]): RootInvocation {
  const hasSubcommand = rawArgs.some((arg) => !arg.startsWith('-'))
  return {
    launchAssist: !hasSubcommand,
    force: rawArgs.includes('--force'),
    passthroughArgs: rawArgs.filter((arg) => !ROOT_FLAGS.has(arg)),
  }
}
