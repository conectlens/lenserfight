import { formatDispatchError } from './error-format'

describe('formatDispatchError', () => {
  it('formats an unknown-command citty error concisely with suggestions', () => {
    const err = Object.assign(new Error('Unknown command AGENTS'), { code: 'E_UNKNOWN_COMMAND', stack: 'Error: Unknown command AGENTS\n    at deep stack frame\n    at another frame' })
    const result = formatDispatchError(err, ['AGENTS'], ['agents'])
    expect(result.cause).toBe('Unknown command "AGENTS".')
    expect(result.invalidToken).toBe('AGENTS')
    expect(result.alternatives).toEqual(['agents'])
    expect(result.recovery).toMatch(/Did you mean "agents"/)
    expect(result.detail).toContain('deep stack frame')
  })

  it('formats an unknown-command error detected by message even without a code', () => {
    const err = new Error('Unknown command foo')
    const result = formatDispatchError(err, ['foo'], [])
    expect(result.cause).toBe('Unknown command "foo".')
    expect(result.recovery).toMatch(/\/help/)
  })

  it('formats a generic error with the message as cause and no alternatives', () => {
    const err = new Error('Battle not found')
    const result = formatDispatchError(err, ['battle', 'view', 'bad-id'], [])
    expect(result.cause).toBe('Battle not found')
    expect(result.alternatives).toEqual([])
    expect(result.recovery).toMatch(/--debug/)
  })

  it('handles non-Error thrown values', () => {
    const result = formatDispatchError('plain string failure', ['x'], [])
    expect(result.cause).toBe('plain string failure')
    expect(result.detail).toBe('plain string failure')
  })
})
