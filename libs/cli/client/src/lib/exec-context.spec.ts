import { getExecContext, setExecContext, _resetForTest } from './exec-context'

beforeEach(() => {
  _resetForTest()
})

describe('getExecContext', () => {
  it('returns defaults on first call', () => {
    const ctx = getExecContext()
    expect(ctx.isLocal).toBe(false)
    expect(ctx.isDebug).toBe(false)
    expect(ctx.commandStartMs).toBeGreaterThan(0)
  })

  it('commandStartMs is a positive integer', () => {
    const ctx = getExecContext()
    expect(Number.isInteger(ctx.commandStartMs)).toBe(true)
    expect(ctx.commandStartMs).toBeGreaterThan(0)
  })
})

describe('setExecContext', () => {
  it('reflects isLocal after set', () => {
    setExecContext({ isLocal: true })
    expect(getExecContext().isLocal).toBe(true)
    expect(getExecContext().isDebug).toBe(false)
  })

  it('reflects isDebug after set', () => {
    setExecContext({ isDebug: true })
    expect(getExecContext().isDebug).toBe(true)
    expect(getExecContext().isLocal).toBe(false)
  })

  it('merges partial updates without clobbering other fields', () => {
    setExecContext({ isLocal: true })
    setExecContext({ isDebug: true })
    const ctx = getExecContext()
    expect(ctx.isLocal).toBe(true)
    expect(ctx.isDebug).toBe(true)
  })

  it('preserves commandStartMs when not overridden', () => {
    const before = getExecContext().commandStartMs
    setExecContext({ isLocal: true })
    expect(getExecContext().commandStartMs).toBe(before)
  })
})

describe('_resetForTest', () => {
  it('restores defaults', () => {
    setExecContext({ isLocal: true, isDebug: true })
    _resetForTest()
    const ctx = getExecContext()
    expect(ctx.isLocal).toBe(false)
    expect(ctx.isDebug).toBe(false)
  })
})
