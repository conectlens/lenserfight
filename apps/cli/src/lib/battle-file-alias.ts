import consola from 'consola'

let warnedBattleLocalAlias = false

/** @internal test-only */
export function _resetBattleLocalAliasWarnForTest(): void {
  warnedBattleLocalAlias = false
}

/** Warn once per process when a deprecated `battle local` path is used. */
export function warnBattleLocalAlias(): void {
  if (warnedBattleLocalAlias) return
  warnedBattleLocalAlias = true
  consola.warn("'battle local' is deprecated. Use 'battle file' instead.")
}

type RunnableCommand = {
  run?: (ctx: { args: Record<string, unknown> }) => Promise<void> | void
}

export function wrapBattleLocalAliasCommand<T extends RunnableCommand>(cmd: T): T {
  const originalRun = cmd.run
  if (!originalRun) return cmd
  return {
    ...cmd,
    async run(ctx) {
      warnBattleLocalAlias()
      return originalRun(ctx)
    },
  } as T
}
