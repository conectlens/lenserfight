export interface LoopHandle {
  stop: () => void
}

/**
 * Schedule a recurring async task. Errors are caught and logged but never
 * crash the loop. The handle's `stop` cancels the next scheduled tick.
 */
export function scheduleLoop(
  name: string,
  intervalMs: number,
  task: () => Promise<void>
): LoopHandle {
  let stopped = false
  let timer: NodeJS.Timeout | null = null

  const tick = async () => {
    if (stopped) return
    try {
      await task()
    } catch (err) {
      process.stderr.write(`[loop:${name}] error: ${(err as Error).message}\n`)
    }
    if (!stopped) timer = setTimeout(tick, intervalMs)
  }

  timer = setTimeout(tick, intervalMs)

  return {
    stop: () => {
      stopped = true
      if (timer) clearTimeout(timer)
    },
  }
}
