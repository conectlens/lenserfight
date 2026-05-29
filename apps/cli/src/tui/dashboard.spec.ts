jest.mock('../lib/data-services', () => ({
  getHumanActivityFeed: jest.fn().mockResolvedValue([]),
}))
jest.mock('../lib/agent-workspace-context', () => ({
  getAgentWorkspaceContext: jest.fn().mockReturnValue(null),
}))
jest.mock('../commands/agents', () => ({
  formatAgentWorkspaceBanner: jest.fn().mockReturnValue(null),
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

import {
  formatActionLogRow,
  formatHealthStatus,
  validateSubcommand,
  getSuggestions,
  COMMAND_CATALOG,
  applyWorkspacePrompt,
} from './dashboard'
import { getAgentWorkspaceContext } from '../lib/agent-workspace-context'

const mockGetAgentWorkspaceContext = getAgentWorkspaceContext as jest.MockedFunction<
  typeof getAgentWorkspaceContext
>

describe('dashboard pure formatters', () => {
  it('formatHealthStatus(true) renders a green pill', () => {
    const out = formatHealthStatus(true)
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

describe('getSuggestions', () => {
  it('returns empty array for empty input', () => {
    expect(getSuggestions('')).toEqual([])
    expect(getSuggestions('  ')).toEqual([])
  })

  it('returns matches for a prefix', () => {
    const results = getSuggestions('battle')
    expect(results.length).toBeGreaterThan(0)
    results.forEach((r) => expect(r.cmd).toContain('battle'))
  })

  it('returns at most 5 results by default', () => {
    // 'a' matches many commands
    const results = getSuggestions('a')
    expect(results.length).toBeLessThanOrEqual(5)
  })

  it('respects the max parameter', () => {
    const results = getSuggestions('battle', 2)
    expect(results.length).toBeLessThanOrEqual(2)
  })

  it('returns empty array for no matches', () => {
    expect(getSuggestions('zzzznonexistent')).toEqual([])
  })

  it('matches partial substrings mid-command', () => {
    const results = getSuggestions('list-profiles')
    expect(results.some((r) => r.cmd.includes('list-profiles'))).toBe(true)
  })

  it('is case-insensitive', () => {
    const lower = getSuggestions('battle')
    const upper = getSuggestions('BATTLE')
    expect(lower.length).toBe(upper.length)
  })
})

describe('applyWorkspacePrompt', () => {
  it('injects selected agent into agent-tab prompts', () => {
    mockGetAgentWorkspaceContext.mockReturnValue({
      aiLenserId: 'agent-uuid',
      handle: 'research-bot',
      displayName: 'Research Bot',
      selectedAt: '2026-05-29T00:00:00Z',
    })
    expect(applyWorkspacePrompt('agents stop ', 'agent')).toContain('research-bot')
    expect(applyWorkspacePrompt('approval list --ai-lenser ', 'agent')).toContain('agent-uuid')
  })
})

describe('COMMAND_CATALOG', () => {
  it('has entries for all major command groups', () => {
    const groups = ['battle', 'schedule', 'memory', 'lenser', 'approval', 'auth']
    for (const g of groups) {
      expect(COMMAND_CATALOG.some((e) => e.cmd.startsWith(g))).toBe(true)
    }
  })

  it('all entries have non-empty cmd and desc', () => {
    COMMAND_CATALOG.forEach((e) => {
      expect(e.cmd.trim().length).toBeGreaterThan(0)
      expect(e.desc.trim().length).toBeGreaterThan(0)
    })
  })
})
