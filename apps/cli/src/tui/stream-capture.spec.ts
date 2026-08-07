import { captureStd, type TranscriptLine } from './stream-capture'

describe('captureStd', () => {
  it('captures whole lines written to stdout and stderr, tagged by stream', () => {
    const lines: TranscriptLine[] = []
    const restore = captureStd((l) => lines.push(l))
    process.stdout.write('hello\n')
    process.stderr.write('oops\n')
    restore()
    expect(lines).toEqual([
      { stream: 'stdout', text: 'hello' },
      { stream: 'stderr', text: 'oops' },
    ])
  })

  it('flushes a trailing partial line (no newline) on restore', () => {
    const lines: TranscriptLine[] = []
    const restore = captureStd((l) => lines.push(l))
    process.stdout.write('no newline yet')
    restore()
    expect(lines).toEqual([{ stream: 'stdout', text: 'no newline yet' }])
  })

  it('splits multi-line chunks into separate lines', () => {
    const lines: TranscriptLine[] = []
    const restore = captureStd((l) => lines.push(l))
    process.stdout.write('a\nb\nc\n')
    restore()
    expect(lines.map((l) => l.text)).toEqual(['a', 'b', 'c'])
  })

  it('restores the original write functions afterward', () => {
    const originalOut = process.stdout.write
    const restore = captureStd(() => undefined)
    expect(process.stdout.write).not.toBe(originalOut)
    restore()
    expect(process.stdout.write).toBe(originalOut)
  })

  it('invokes a write callback if one was passed', () => {
    const restore = captureStd(() => undefined)
    const cb = jest.fn()
    process.stdout.write('x\n', cb)
    restore()
    expect(cb).toHaveBeenCalled()
  })
})
