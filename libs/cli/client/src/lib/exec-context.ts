export interface ExecContext {
  isLocal: boolean
  isDebug: boolean
  commandStartMs: number
  /** Set by the TUI while a command is dispatched; long-running commands may check/forward this to cancel on Ctrl+C. */
  cancelSignal: AbortSignal | null
}

let ctx: ExecContext = { isLocal: false, isDebug: false, commandStartMs: Date.now(), cancelSignal: null }

export function setExecContext(partial: Partial<ExecContext>): void {
  ctx = { ...ctx, ...partial }
}

export function getExecContext(): Readonly<ExecContext> {
  return ctx
}

export function _resetForTest(): void {
  ctx = { isLocal: false, isDebug: false, commandStartMs: Date.now(), cancelSignal: null }
}
