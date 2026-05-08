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

import { formatActionLogRow, formatHealthStatus } from './dashboard'

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
