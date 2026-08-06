// citty is ESM-only with no CJS build; every command spec in this project
// mocks it the same way (see e.g. commands/battle.spec.ts) rather than
// fighting ts-jest's commonjs transform for it.
jest.mock('citty', () => ({ runCommand: jest.fn() }))

jest.mock('../lib/data-services', () => ({
  getHumanActivityFeed: jest.fn(),
}))

// command-inventory.ts pulls in current-script-url.ts, which uses
// import.meta.url (invalid under ts-jest's commonjs module target — see the
// same mock in command-inventory.spec.ts). buildCommandInventory() itself is
// exercised there, not here, so a resolved stub is enough.
jest.mock('../lib/command-inventory', () => ({
  buildCommandInventory: jest.fn().mockResolvedValue([]),
}))

import { getHumanActivityFeed } from '../lib/data-services'
import {
  formatHealthStatus,
  formatActionLogRow,
  getSuggestions,
  cycleSuggestion,
  tokenise,
  fetchRecentLogs,
  _setCommandSuggestionsForTest,
} from './dashboard'

const mockGetHumanActivityFeed = getHumanActivityFeed as jest.MockedFunction<typeof getHumanActivityFeed>

describe('formatHealthStatus', () => {
  it('renders a HEALTHY pill for true', () => {
    expect(formatHealthStatus(true)).toContain('HEALTHY')
  })

  it('renders a DOWN pill for false', () => {
    expect(formatHealthStatus(false)).toContain('DOWN')
  })
})

describe('formatActionLogRow', () => {
  it('formats timestamp, action type, and truncated payload', () => {
    const line = formatActionLogRow({
      action_type: 'ai.tool_invoke',
      payload: { tool: 'search' },
      created_at: '2026-05-08T00:00:00Z',
    })
    expect(line).toContain('ai.tool_invoke')
    expect(line).toContain('"tool":"search"')
  })

  it('falls back to placeholders for missing fields', () => {
    const line = formatActionLogRow({})
    expect(line).toContain('—')
  })
})

describe('command suggestions', () => {
  afterEach(() => {
    _setCommandSuggestionsForTest(null)
  })

  it('returns no suggestions until the cache is seeded', () => {
    expect(getSuggestions('battle')).toEqual([])
  })

  it('ranks prefix matches ahead of mid-string matches', () => {
    _setCommandSuggestionsForTest([
      { cmd: 'battle run', desc: 'Run a battle round' },
      { cmd: 'run submit', desc: 'Submit a response for a running battle' },
    ])
    const results = getSuggestions('run')
    expect(results[0].cmd).toBe('run submit')
    expect(results[1].cmd).toBe('battle run')
  })

  it('returns nothing for blank input', () => {
    _setCommandSuggestionsForTest([{ cmd: 'status', desc: 'Show status' }])
    expect(getSuggestions('   ')).toEqual([])
  })
})

describe('cycleSuggestion', () => {
  it('returns -1 when there are no candidates', () => {
    expect(cycleSuggestion(-1, 0, 1)).toBe(-1)
  })

  it('wraps forward past the last index', () => {
    expect(cycleSuggestion(2, 3, 1)).toBe(0)
  })

  it('wraps backward past the first index', () => {
    expect(cycleSuggestion(0, 3, -1)).toBe(2)
  })
})

describe('tokenise', () => {
  it('splits on whitespace', () => {
    expect(tokenise('battle list --status open')).toEqual(['battle', 'list', '--status', 'open'])
  })

  it('respects single and double quotes', () => {
    expect(tokenise(`battle create --title "My Battle" --slug 'my-slug'`)).toEqual([
      'battle',
      'create',
      '--title',
      'My Battle',
      '--slug',
      'my-slug',
    ])
  })
})

describe('fetchRecentLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('maps activity-feed rows to ActionLogRow shape', async () => {
    mockGetHumanActivityFeed.mockResolvedValue([
      {
        occurred_at: '2026-05-08T00:00:00Z',
        kind: 'agent_action',
        ai_lenser_id: 'agent-1',
        ai_lenser_handle: 'agent',
        ai_lenser_name: 'Agent',
        title: 'x',
        status: 'ok',
        team_run_id: null,
        workflow_id: null,
        schedule_id: null,
        action_type: 'run_lens',
        payload: { tool: 'search' },
      },
    ])

    const rows = await fetchRecentLogs()
    expect(rows).toEqual([
      {
        ai_lenser_id: 'agent-1',
        team_run_id: null,
        action_type: 'run_lens',
        payload: { tool: 'search' },
        created_at: '2026-05-08T00:00:00Z',
      },
    ])
  })

  it('degrades to an empty array on fetch failure', async () => {
    mockGetHumanActivityFeed.mockRejectedValue(new Error('network error'))
    await expect(fetchRecentLogs()).resolves.toEqual([])
  })
})
