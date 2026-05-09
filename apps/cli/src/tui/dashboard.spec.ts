jest.mock('../utils/api', () => ({
  callRest: jest.fn().mockResolvedValue([]),
  callRpc: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/profiles', () => ({
  getActiveProfileName: jest.fn().mockResolvedValue('default'),
}))
jest.mock('../config/project-config', () => ({
  resolveConfig: () => ({ supabaseUrl: '', supabaseAnonKey: '', cloudApiUrl: '' }),
}))
jest.mock('../utils/output', () => ({
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import { formatActionLogRow, formatHealthStatus, validateSubcommand } from './dashboard'

describe('dashboard pure formatters', () => {
  it('formatHealthStatus(true) renders a green pill', () => {
    const out = formatHealthStatus(true)
    // Green ANSI sequence
    expect(out).toContain('\x1b[42m')
    expect(out).toContain('HEALTHY')
  })

  it('formatHealthStatus(false) renders a red pill', () => {
    const out = formatHealthStatus(false)
    expect(out).toContain('\x1b[41m')
    expect(out).toContain('DOWN')
  })

  it('formatActionLogRow truncates long payloads', () => {
    const huge = 'x'.repeat(500)
    const out = formatActionLogRow({
      action_type: 'ai.tool_invoke',
      payload: { blob: huge },
      created_at: '2026-05-08T00:00:00Z',
    })
    expect(out).toContain('ai.tool_invoke')
    // Truncation marker present, full blob not present.
    expect(out).toContain('…')
    expect(out.length).toBeLessThan(huge.length + 200)
  })

  it('formatActionLogRow handles missing fields gracefully', () => {
    const out = formatActionLogRow({})
    expect(out).toContain('—')
  })
})

describe('validateSubcommand', () => {
  it('returns null for unknown subcommands', () => {
    expect(validateSubcommand(['battle', 'list'])).toBeNull()
  })

  it('returns null when all required flags are present (--flag value)', () => {
    expect(validateSubcommand(['approval', 'list', '--ai-lenser', 'uuid-123'])).toBeNull()
  })

  it('returns null when required flag uses --flag=value form', () => {
    expect(validateSubcommand(['approval', 'list', '--ai-lenser=uuid-123'])).toBeNull()
  })

  it('returns an error message when --ai-lenser is missing', () => {
    const err = validateSubcommand(['approval', 'list', '--status=pending'])
    expect(err).not.toBeNull()
    expect(err).toContain('--ai-lenser')
  })

  it('returns null for bare subcommands with no required flags', () => {
    expect(validateSubcommand(['memory'])).toBeNull()
  })
})
