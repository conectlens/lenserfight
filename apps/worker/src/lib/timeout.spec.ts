import { withTimeout, timeoutSignal, combineSignals, TimeoutError } from './timeout'

describe('withTimeout', () => {
  it('resolves when the promise settles before the timeout', async () => {
    await expect(withTimeout(Promise.resolve('ok'), 1000, 'fast')).resolves.toBe('ok')
  })

  it('rejects with TimeoutError when the promise is too slow', async () => {
    const slow = new Promise<string>((resolve) => setTimeout(() => resolve('late'), 50))
    await expect(withTimeout(slow, 10, 'slow')).rejects.toBeInstanceOf(TimeoutError)
  })

  it('propagates the original rejection', async () => {
    await expect(withTimeout(Promise.reject(new Error('boom')), 1000, 'err')).rejects.toThrow('boom')
  })
})

describe('timeoutSignal', () => {
  it('returns an AbortSignal that is not aborted immediately', () => {
    const s = timeoutSignal(10_000)
    expect(s).toBeInstanceOf(AbortSignal)
    expect(s.aborted).toBe(false)
  })

  it('aborts after the configured delay', async () => {
    const s = timeoutSignal(10)
    await new Promise((r) => setTimeout(r, 30))
    expect(s.aborted).toBe(true)
  })
})

describe('combineSignals', () => {
  it('returns the single signal unchanged when only one is provided', () => {
    const a = new AbortController().signal
    expect(combineSignals(a, undefined)).toBe(a)
  })

  it('aborts when any input signal aborts', () => {
    const c1 = new AbortController()
    const c2 = new AbortController()
    const combined = combineSignals(c1.signal, c2.signal)
    expect(combined.aborted).toBe(false)
    c2.abort()
    expect(combined.aborted).toBe(true)
  })

  it('is already aborted when an input is pre-aborted', () => {
    const c1 = new AbortController()
    c1.abort()
    const combined = combineSignals(c1.signal, new AbortController().signal)
    expect(combined.aborted).toBe(true)
  })
})
