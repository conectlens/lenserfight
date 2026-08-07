import { createStableWriteStream } from './ink-io-proxy'

describe('createStableWriteStream', () => {
  it('always calls the write function captured at creation time, even after stream.write is reassigned later', () => {
    const originalWrites: string[] = []
    const laterWrites: string[] = []
    const fakeStream = {
      write: (chunk: unknown) => {
        originalWrites.push(String(chunk))
        return true
      },
    } as unknown as NodeJS.WriteStream

    const stable = createStableWriteStream(fakeStream)

    // Simulates stream-capture.ts's captureStd() reassigning the real
    // stream's .write property for the duration of a dispatched command.
    fakeStream.write = ((chunk: unknown) => {
      laterWrites.push(String(chunk))
      return true
    }) as typeof fakeStream.write

    stable.write('frame-1')
    stable.write('frame-2')

    expect(originalWrites).toEqual(['frame-1', 'frame-2'])
    expect(laterWrites).toEqual([])
  })

  it('forwards non-write property access to the real stream', () => {
    const fakeStream = { write: () => true, columns: 42 } as unknown as NodeJS.WriteStream
    const stable = createStableWriteStream(fakeStream)
    expect(stable.columns).toBe(42)
  })
})
