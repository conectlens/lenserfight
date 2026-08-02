import { isInteractiveTerminal } from './interactive-terminal'

describe('isInteractiveTerminal', () => {
  let originalStdoutIsTTY: boolean | undefined
  let originalStdinIsTTY: boolean | undefined

  beforeEach(() => {
    originalStdoutIsTTY = process.stdout.isTTY
    originalStdinIsTTY = process.stdin.isTTY
  })

  afterEach(() => {
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdoutIsTTY, configurable: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdinIsTTY, configurable: true })
  })

  it('returns true when both stdout and stdin are TTYs', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    expect(isInteractiveTerminal()).toBe(true)
  })

  it('returns false when stdout is not a TTY', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: false, configurable: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
    expect(isInteractiveTerminal()).toBe(false)
  })

  it('returns false when stdin is not a TTY', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
    expect(isInteractiveTerminal()).toBe(false)
  })

  it('returns false when neither is a TTY (e.g. piped, CI, or an agent-run terminal)', () => {
    Object.defineProperty(process.stdout, 'isTTY', { value: undefined, configurable: true })
    Object.defineProperty(process.stdin, 'isTTY', { value: undefined, configurable: true })
    expect(isInteractiveTerminal()).toBe(false)
  })
})
