/**
 * Ink writes its own frames via `this.options.stdout.write(...)` — a dynamic
 * property lookup on whatever stream object it was given, evaluated fresh on
 * every write. stream-capture.ts's captureStd() works by reassigning the
 * mutable `process.stdout.write`/`process.stderr.write` properties for the
 * duration of a dispatched command, so if Ink were rendering through the same
 * (mutable) `process.stdout`, a running command's output capture would also
 * silently swallow Ink's own frame updates — freezing the screen instead of
 * showing live progress.
 *
 * This wraps the real streams in a Proxy whose `write` is bound to the
 * *original* function, captured once here before anything has a chance to
 * patch it. Ink is rendered against these proxies, so its writes always reach
 * the real terminal regardless of what stream-capture.ts does to the mutable
 * global in the meantime.
 */
export function createStableWriteStream(stream: NodeJS.WriteStream): NodeJS.WriteStream {
  const trueWrite = stream.write.bind(stream)
  return new Proxy(stream, {
    get(target, prop, receiver) {
      if (prop === 'write') return trueWrite
      return Reflect.get(target, prop, receiver)
    },
  }) as NodeJS.WriteStream
}
