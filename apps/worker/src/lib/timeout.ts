// Worker timeout helpers.
//
// Node's global fetch/undici has NO default response timeout, so a hung
// provider connection would otherwise block a worker tick forever. Every
// provider/LLM call in the worker MUST be bounded by one of these.

/** Ceiling for a single provider/LLM/media call. Overridable per deployment. */
export const PROVIDER_TIMEOUT_MS = parseInt(
  process.env['WORKER_PROVIDER_TIMEOUT_MS'] ?? '120000',
  10,
)

/** Ceiling for executing an entire workflow run (the whole DAG). */
export const WORKFLOW_RUN_TIMEOUT_MS = parseInt(
  process.env['WORKER_WORKFLOW_TIMEOUT_MS'] ?? '600000',
  10,
)

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`)
    this.name = 'TimeoutError'
  }
}

/**
 * Races a promise against a timeout. Use for provider calls that do NOT accept
 * an AbortSignal (e.g. callGenerativeMedia). The underlying request is not
 * cancelled, but the worker loop is freed so one stuck call cannot wedge the
 * whole tick. Prefer passing {@link timeoutSignal} directly where supported.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer)
  }) as Promise<T>
}

/**
 * AbortSignal that aborts after `ms`. Pass to callProvider/streamProvider and
 * to WorkflowExecutionContext.signal for real (socket-level) cancellation.
 */
export function timeoutSignal(ms: number = PROVIDER_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms)
}

/**
 * Combines multiple AbortSignals into one that aborts when any input aborts.
 * Uses the native AbortSignal.any when available (Node 20.3+) and falls back to
 * a manual controller otherwise.
 */
export function combineSignals(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const present = signals.filter((s): s is AbortSignal => s != null)
  if (present.length === 1) return present[0]
  const anyFn = (AbortSignal as unknown as { any?: (s: AbortSignal[]) => AbortSignal }).any
  if (anyFn) return anyFn(present)
  const controller = new AbortController()
  for (const s of present) {
    if (s.aborted) { controller.abort(s.reason); break }
    s.addEventListener('abort', () => controller.abort(s.reason), { once: true })
  }
  return controller.signal
}
