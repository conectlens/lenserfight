/**
 * Tests for the CLI error reporter.
 *
 * We capture process.stderr.write calls to verify the rendered output without
 * spawning a subprocess, and reset exec-context and env vars after each test.
 */

// Mock exec-context so we can control isDebug
jest.mock('../lib/exec-context', () => ({
  getExecContext: jest.fn(() => ({ isLocal: false, isDebug: false, commandStartMs: 0 })),
}))

import { getExecContext } from '../lib/exec-context'
import { reportCliError, handleCliError } from './error-reporter'

const mockGetExecContext = getExecContext as jest.MockedFunction<typeof getExecContext>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function captureStderr(fn: () => void): string {
  const chunks: string[] = []
  const original = process.stderr.write.bind(process.stderr)
  jest.spyOn(process.stderr, 'write').mockImplementation((...args: Parameters<typeof process.stderr.write>) => {
    chunks.push(String(args[0]))
    return true
  })
  fn()
  jest.spyOn(process.stderr, 'write').mockRestore()
  return chunks.join('')
}

function withNoColor(fn: () => void): void {
  const prev = process.env['NO_COLOR']
  process.env['NO_COLOR'] = '1'
  try { fn() } finally {
    if (prev === undefined) delete process.env['NO_COLOR']
    else process.env['NO_COLOR'] = prev
  }
}

function withDebug(fn: () => void): void {
  mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: true, commandStartMs: 0 })
  try { fn() } finally {
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  }
}

// ─── Default mode ─────────────────────────────────────────────────────────────

describe('reportCliError — default mode', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1' // force plain-text for deterministic assertions
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })

  afterEach(() => {
    delete process.env['NO_COLOR']
  })

  it('writes to stderr', () => {
    const output = captureStderr(() => reportCliError(new Error('test error')))
    expect(output.length).toBeGreaterThan(0)
  })

  it('includes the error headline', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('ACCESS DENIED')
  })

  it('includes the error detail', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('Authentication required')
  })

  it('includes recovery hints', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('lf auth login')
  })

  it('shows next steps label', () => {
    const output = captureStderr(() => reportCliError(new Error('something weird')))
    expect(output).toContain('next steps:')
  })

  it('emits only 2 hints by default (compact mode)', () => {
    const output = captureStderr(() => reportCliError(new Error('gateway error')))
    // Count "→" arrows in the hints block (each hint starts with →)
    const arrows = (output.match(/→/g) || []).length
    expect(arrows).toBeLessThanOrEqual(3) // 2 hints + possibly 1 arrow in "next steps" label
  })

  it('includes docs link for high-confusion errors', () => {
    const output = captureStderr(() => reportCliError(new Error('gateway unavailable')))
    expect(output).toContain('docs')
  })

  it('skips docs link for rate_limited (low confusion)', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 429 })))
    expect(output).not.toContain('docs:')
  })

  it('renders a separator line', () => {
    const output = captureStderr(() => reportCliError(new Error('fail')))
    expect(output).toContain('─')
  })
})

// ─── Plain-text / NO_COLOR mode ───────────────────────────────────────────────

describe('reportCliError — NO_COLOR mode', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1'
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })
  afterEach(() => { delete process.env['NO_COLOR'] })

  it('contains no ANSI escape sequences', () => {
    const output = captureStderr(() => reportCliError(new Error('plain error')))
    // eslint-disable-next-line no-control-regex
    expect(output).not.toMatch(/\x1b\[/)
  })

  it('still shows the headline', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('ACCESS DENIED')
  })

  it('still shows recovery hints', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('lf auth login')
  })

  it('uses bracketed format for the headline in plain text', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    expect(output).toContain('[UNAUTHORIZED]')
  })

  it('renders docs URL inline instead of OSC 8 hyperlink', () => {
    const output = captureStderr(() => reportCliError(new Error('gateway error')))
    expect(output).toContain('docs.lenserfight.com')
    // No OSC 8 sequences
    expect(output).not.toContain('\x1b]8;;')
  })
})

// ─── JSON mode ────────────────────────────────────────────────────────────────

describe('reportCliError — JSON mode', () => {
  beforeEach(() => {
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })

  it('emits valid JSON to stderr', () => {
    const output = captureStderr(() => reportCliError(new Error('fail'), { json: true }))
    expect(() => JSON.parse(output)).not.toThrow()
  })

  it('JSON includes the kind field', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 }), { json: true }))
    const parsed = JSON.parse(output)
    expect(parsed.kind).toBe('unauthorized')
  })

  it('JSON includes headline, detail, recoverable', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 }), { json: true }))
    const parsed = JSON.parse(output)
    expect(parsed.headline).toBe('ACCESS DENIED')
    expect(typeof parsed.recoverable).toBe('boolean')
    expect(typeof parsed.detail).toBe('string')
  })

  it('JSON mode emits no ANSI sequences', () => {
    const output = captureStderr(() => reportCliError(new Error('fail'), { json: true }))
    // eslint-disable-next-line no-control-regex
    expect(output).not.toMatch(/\x1b\[/)
  })

  it('JSON includes the raw error message', () => {
    const output = captureStderr(() => reportCliError(new Error('network timeout'), { json: true }))
    const parsed = JSON.parse(output)
    expect((parsed.raw as Record<string, unknown>)['message']).toContain('network timeout')
  })
})

// ─── Debug mode ───────────────────────────────────────────────────────────────

describe('reportCliError — debug mode', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1'
  })
  afterEach(() => {
    delete process.env['NO_COLOR']
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })

  it('shows more than 2 hints when additional hints exist', () => {
    withDebug(() => {
      const output = captureStderr(() => reportCliError(new Error('gateway error')))
      const arrows = (output.match(/→/g) || []).length
      // In debug mode all hints are shown — gateway has 4 hints
      expect(arrows).toBeGreaterThan(2)
    })
  })

  it('shows stack trace for Error instances', () => {
    withDebug(() => {
      const err = new Error('debug error')
      const output = captureStderr(() => reportCliError(err))
      expect(output).toContain('Stack trace:')
    })
  })

  it('shows taxonomy line with kind and recoverable flag', () => {
    withDebug(() => {
      const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
      expect(output).toContain('taxonomy:')
      expect(output).toContain('recoverable=true')
    })
  })

  it('shows inspect area', () => {
    withDebug(() => {
      const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
      expect(output).toContain('inspect:')
    })
  })
})

// ─── Context label ────────────────────────────────────────────────────────────

describe('reportCliError — context label', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1'
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })
  afterEach(() => { delete process.env['NO_COLOR'] })

  it('shows battle context when battleId is attached', () => {
    const err = Object.assign(new Error('battle failed'), { battleId: 'battle-xyz' })
    const output = captureStderr(() => reportCliError(err))
    expect(output).toContain('battle:battle-xyz')
  })

  it('shows provider context when provider is attached', () => {
    const err = Object.assign(new Error('provider error'), { provider: 'openai', code: 'PROVIDER_ERROR' })
    const output = captureStderr(() => reportCliError(err))
    expect(output).toContain('provider:openai')
  })

  it('shows workflow context when workflowId and nodeId are attached', () => {
    const err = Object.assign(new Error('workflow failed'), {
      workflowId: 'wf-1',
      nodeId: 'node-2',
      code: 'WORKFLOW_ERROR',
    })
    const output = captureStderr(() => reportCliError(err))
    expect(output).toContain('workflow:wf-1')
    expect(output).toContain('node:node-2')
  })

  it('omits context line when no metadata is present', () => {
    const output = captureStderr(() => reportCliError(new Error('plain error')))
    // Context label uses "battle:", "workflow:", etc. — none should appear.
    expect(output).not.toContain('battle:')
    expect(output).not.toContain('workflow:')
  })
})

// ─── handleCliError ───────────────────────────────────────────────────────────

describe('handleCliError', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1'
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
    process.exitCode = 0
  })
  afterEach(() => {
    delete process.env['NO_COLOR']
    process.exitCode = 0
  })

  it('sets process.exitCode to 1', () => {
    captureStderr(() => handleCliError(new Error('fail')))
    expect(process.exitCode).toBe(1)
  })

  it('does not throw', () => {
    expect(() => captureStderr(() => handleCliError(new Error('fail')))).not.toThrow()
  })

  it('passes json option through to reportCliError', () => {
    const output = captureStderr(() => handleCliError(new Error('fail'), { json: true }))
    expect(() => JSON.parse(output)).not.toThrow()
  })
})

// ─── Accessibility: never rely solely on color ─────────────────────────────────

describe('accessibility — semantic labels independent of color', () => {
  beforeEach(() => {
    process.env['NO_COLOR'] = '1'
    mockGetExecContext.mockReturnValue({ isLocal: false, isDebug: false, commandStartMs: 0 })
  })
  afterEach(() => { delete process.env['NO_COLOR'] })

  it('headline in plain text is distinguishable without color ([KIND] prefix)', () => {
    const output = captureStderr(() => reportCliError(Object.assign(new Error('fail'), { status: 401 })))
    // The kind prefix makes the error identifiable without color
    expect(output).toMatch(/\[unauthorized\]/i)
  })

  it('arrow symbols → convey navigation without color', () => {
    const output = captureStderr(() => reportCliError(new Error('gateway error')))
    expect(output).toContain('→')
  })

  it('separator lines structure output visually without color', () => {
    const output = captureStderr(() => reportCliError(new Error('fail')))
    expect(output).toContain('─')
  })
})
