/**
 * Temporarily redirects process.stdout/stderr writes into a callback instead
 * of the real terminal, so a dispatched command's output can be captured into
 * a transcript entry and rendered inside Ink's own frame (writing raw bytes
 * straight to the terminal while Ink also owns the terminal is what produces
 * the flicker/wipe the old dashboard worked around by unmounting first).
 *
 * consola's default reporter goes through console.log/error, which in turn
 * call process.stdout/stderr.write, so this captures consola output too
 * without any consola-specific hook.
 */
export interface TranscriptLine {
  stream: 'stdout' | 'stderr' | 'info'
  text: string
}

type WriteFn = typeof process.stdout.write

function wrap(onLine: (line: TranscriptLine) => void, stream: 'stdout' | 'stderr'): WriteFn {
  let buffer = ''
  const fn = ((chunk: unknown, encodingOrCb?: unknown, maybeCb?: unknown): boolean => {
    const text = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf-8') : String(chunk)
    buffer += text
    const parts = buffer.split(/\r?\n/)
    buffer = parts.pop() ?? ''
    for (const line of parts) onLine({ stream, text: line })

    const cb = typeof encodingOrCb === 'function' ? encodingOrCb : typeof maybeCb === 'function' ? maybeCb : undefined
    if (typeof cb === 'function') (cb as () => void)()
    return true
  }) as WriteFn
  // Attach a flush hook the outer restore() can call for the trailing partial line.
  ;(fn as unknown as { __flush: () => void }).__flush = () => {
    if (buffer) {
      onLine({ stream, text: buffer })
      buffer = ''
    }
  }
  return fn
}

/** Starts capturing; returns a restore function that also flushes any trailing partial line. */
export function captureStd(onLine: (line: TranscriptLine) => void): () => void {
  const originalOut = process.stdout.write
  const originalErr = process.stderr.write

  const outWrap = wrap(onLine, 'stdout')
  const errWrap = wrap(onLine, 'stderr')
  process.stdout.write = outWrap
  process.stderr.write = errWrap

  return () => {
    ;(outWrap as unknown as { __flush: () => void }).__flush()
    ;(errWrap as unknown as { __flush: () => void }).__flush()
    process.stdout.write = originalOut
    process.stderr.write = originalErr
  }
}
