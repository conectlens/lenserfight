/**
 * Decides what a bare `lf` invocation should do.
 *
 * citty dispatches the first *non-flag* token in rawArgs as a subcommand and
 * then still calls the root command's `run()`. So the root handler cannot key
 * off `rawArgs.length` to detect "no subcommand" — that treats `lf --local`
 * as if a subcommand had run, and the CLI exits silently having done nothing.
 */

export interface RootInvocation {
  /** True when no subcommand was dispatched, so the TUI dashboard should launch. */
  launchDashboard: boolean
}

export function resolveRootInvocation(rawArgs: readonly string[]): RootInvocation {
  const hasSubcommand = rawArgs.some((arg) => !arg.startsWith('-'))
  return {
    launchDashboard: !hasSubcommand,
  }
}
