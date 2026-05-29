export interface ExecContext {
  isLocal: boolean
  isDebug: boolean
  commandStartMs: number
}

let ctx: ExecContext = { isLocal: false, isDebug: false, commandStartMs: Date.now() }

export function setExecContext(partial: Partial<ExecContext>): void {
  ctx = { ...ctx, ...partial }
}

export function getExecContext(): Readonly<ExecContext> {
  return ctx
}

export function _resetForTest(): void {
  ctx = { isLocal: false, isDebug: false, commandStartMs: Date.now() }
}
