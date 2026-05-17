jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    start: jest.fn(),
    success: jest.fn(),
    log: jest.fn(),
  },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
  callRest: jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../utils/output', () => ({
  printTable: jest.fn(),
  printJson: jest.fn(),
  truncate: (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

import consola from 'consola'
import { callRpc, callRest, handleError } from '../utils/api'
import { printTable, printJson } from '../utils/output'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockCallRest = callRest as jest.MockedFunction<typeof callRest>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>
const mockPrintTable = printTable as jest.MockedFunction<typeof printTable>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const consolaSuccess = (consola as unknown as { success: jest.Mock }).success
const consolaError = (consola as unknown as { error: jest.Mock }).error
const consolaInfo = (consola as unknown as { info: jest.Mock }).info
const consolaLog = (consola as unknown as { log: jest.Mock }).log

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = {
  run?: (ctx: any) => Promise<void>
  subCommands?: Record<string, AnyCmd | (() => Promise<AnyCmd>)>
}

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

async function getSubCmd(key: string): Promise<AnyCmd> {
  const { default: battleCmd } = (await import('./battle')) as { default: AnyCmd }
  const sub = battleCmd.subCommands?.[key]
  return typeof sub === 'function' ? sub() : (sub as AnyCmd)
}

describe('battle create', () => {
  it('calls fn_battles_create and succeeds', async () => {
    const battle = { id: 'battle-uuid', title: 'My Battle', status: 'draft', slug: 'my-battle' }
    mockCallRpc.mockResolvedValueOnce(battle)

    const createCmd = await getSubCmd('create')
    await createCmd.run?.({
      args: {
        title: 'My Battle',
        slug: 'my-battle',
        task: 'Write a poem',
        'rubric-id': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_create',
      expect.objectContaining({ p_title: 'My Battle', p_slug: 'my-battle' }),
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('battle join', () => {
  it('calls fn_battles_join and prints submission tip', async () => {
    mockCallRpc.mockResolvedValueOnce({ battle_id: 'battle-uuid', joined: true })

    const joinCmd = await getSubCmd('join')
    await joinCmd.run?.({
      args: { id: 'battle-uuid', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_join',
      {
        p_battle_id: 'battle-uuid',
        p_agent_id: null,
        p_runner_mode: 'cloud',
        p_device_id: null,
      },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Joined battle %s.', 'battle-uuid')
    expect(
      consolaInfo.mock.calls.some(([message]) => String(message).includes('lf battle submit'))
    ).toBe(true)
  })

  it('calls handleError when join fails', async () => {
    const err = new Error('Battle not found')
    mockCallRpc.mockRejectedValueOnce(err)

    const joinCmd = await getSubCmd('join')
    await joinCmd.run?.({
      args: { id: 'missing-uuid', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockHandleError).toHaveBeenCalledWith(err)
  })
})

describe('battle submit', () => {
  it('calls fn_battle_submit_contender with text submission', async () => {
    mockCallRpc.mockResolvedValueOnce({ submission_id: 'sub-uuid' })

    const submitCmd = await getSubCmd('submit')
    await submitCmd.run?.({
      args: { id: 'battle-uuid', text: 'My response', url: '', 'run-id': '', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_submit',
      expect.objectContaining({
        p_battle_id: 'battle-uuid',
        p_content_text: 'My response',
        p_source_type: 'text',
      }),
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalled()
  })

  it('uses execution_run source type when --run-id is provided', async () => {
    mockCallRpc.mockResolvedValueOnce({ submission_id: 'sub-uuid' })

    const submitCmd = await getSubCmd('submit')
    await submitCmd.run?.({
      args: { id: 'battle-uuid', text: '', url: '', 'run-id': 'run-xyz', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_submit',
      expect.objectContaining({
        p_execution_run_id: 'run-xyz',
        p_source_type: 'execution_run',
      }),
      { requireAuth: true }
    )
  })
})

describe('battle rematch', () => {
  it('resolves slug→id, calls fn_battles_create_rematch, then prints new slug', async () => {
    // 1) parent lookup by slug via RPC
    mockCallRpc.mockResolvedValueOnce([
      { id: 'parent-uuid', slug: 'my-battle' },
    ])
    // 2) create rematch RPC returns new id
    mockCallRpc.mockResolvedValueOnce('child-uuid')
    // 3) get new battle RPC returns new slug
    mockCallRpc.mockResolvedValueOnce([{ id: 'child-uuid', slug: 'my-battle-rematch' }])

    const rematchCmd = await getSubCmd('rematch')
    await rematchCmd.run?.({
      args: { slug: 'my-battle', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)

    // First RPC: lookup parent battle by slug
    expect(mockCallRpc).toHaveBeenNthCalledWith(
      1,
      'fn_get_battle_by_slug',
      { p_slug: 'my-battle' },
      { requireAuth: true }
    )

    // Second RPC: create rematch
    expect(mockCallRpc).toHaveBeenNthCalledWith(
      2,
      'fn_battles_create_rematch',
      { p_parent_id: 'parent-uuid' },
      { requireAuth: true }
    )

    // Third RPC: resolve new id → new slug
    expect(mockCallRpc).toHaveBeenNthCalledWith(
      3,
      'fn_get_battle',
      { p_battle_id: 'child-uuid' },
      { requireAuth: true }
    )

    expect(consolaSuccess).toHaveBeenCalledWith('Created rematch: %s', 'my-battle-rematch')
    expect(mockHandleError).not.toHaveBeenCalled()
  })

  it('errors when slug does not resolve to a battle', async () => {
    mockCallRpc.mockResolvedValueOnce([])

    const rematchCmd = await getSubCmd('rematch')
    await rematchCmd.run?.({
      args: { slug: 'missing-slug', json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_battle_by_slug',
      { p_slug: 'missing-slug' },
      { requireAuth: true }
    )
    expect(mockHandleError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('missing-slug') })
    )
  })
})

describe('battle open', () => {
  it('calls fn_battles_open', async () => {
    const battleId = '00000000-0000-0000-0000-000000000001'
    mockCallRpc.mockResolvedValueOnce(null)

    const openCmd = await getSubCmd('open')
    await openCmd.run?.({
      args: { id: battleId },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_open',
      { p_battle_id: battleId },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalled()
  })
})

describe('battle new --from-template', () => {
  it('resolves a slug to a template id and creates the battle', async () => {
    mockCallRpc
      .mockResolvedValueOnce([
        { id: 'tpl-uuid', title: 'Reasoning Quality Shootout' },
        { id: 'other', title: 'Unrelated' },
      ])
      .mockResolvedValueOnce({ id: 'new-battle', slug: 'smoke-1', title: 'Smoke test' })

    const newCmd = await getSubCmd('new')
    await newCmd.run?.({
      args: {
        'from-template': 'reasoning-quality-shootout',
        title: 'Smoke test',
        slug: 'smoke-1',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenNthCalledWith(
      1,
      'fn_list_public_battle_templates',
      { p_category: null, p_limit: 100 },
      { requireAuth: false }
    )
    expect(mockCallRpc).toHaveBeenNthCalledWith(
      2,
      'fn_battles_create_from_template',
      { p_template_id: 'tpl-uuid', p_title: 'Smoke test', p_slug: 'smoke-1' },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Battle created: /battles/%s', 'smoke-1')
  })
})

// ── Phase CB gap: check-readiness, auto-promote, webhook add ─────────────────

describe('battle check-readiness', () => {
  it('exits 1 and prints blocker when battle is not ready', async () => {
    mockCallRpc.mockResolvedValueOnce({ ready: false, blockers: ['No contenders'] })

    const cmd = await getSubCmd('check-readiness')
    await cmd.run?.({ args: { id: 'battle-uuid', json: false }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_check_readiness',
      { p_battle_id: 'battle-uuid' },
      { requireAuth: true }
    )
    expect(process.exitCode).toBe(1)
  })
})

describe('battle auto-promote', () => {
  it('prints success when battle is promoted', async () => {
    mockCallRpc.mockResolvedValueOnce(true)

    const cmd = await getSubCmd('auto-promote')
    await cmd.run?.({ args: { id: 'battle-uuid' }, cmd: {}, rawArgs: [] })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_auto_promote',
      { p_battle_id: 'battle-uuid' },
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Battle %s promoted to open.', 'battle-uuid')
  })
})

describe('battle webhook add', () => {
  it('prints subscription ID on success', async () => {
    const subId = 'sub-uuid-1234'
    mockCallRpc.mockResolvedValueOnce(subId)

    const webhookCmd = await getSubCmd('webhook') as { subCommands?: Record<string, { run?: (ctx: unknown) => Promise<void> }> }
    await webhookCmd.subCommands?.['add']?.run?.({
      args: { id: 'battle-uuid', url: 'https://example.com', events: 'status_change' },
      cmd: {},
      rawArgs: [],
    })

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_battles_subscribe_webhook',
      expect.objectContaining({ p_battle_id: 'battle-uuid', p_webhook_url: 'https://example.com' }),
      { requireAuth: true }
    )
    expect(consolaSuccess).toHaveBeenCalledWith('Webhook subscription created: %s', subId)
  })
})

// ── V2 concept separation commands ──────────────────────────────────────────

describe('battle formats', () => {
  it('lists task sources with contender and judging tree', async () => {
    const cmd = await getSubCmd('formats')
    await cmd.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    // Should print at least 3 task sources (lens, workflow, challenge)
    expect(consolaLog).toHaveBeenCalled()
    const calls = consolaLog.mock.calls.map(([msg]) => String(msg))
    expect(calls.some((c) => c.includes('Lens Task'))).toBe(true)
    expect(calls.some((c) => c.includes('Workflow Task'))).toBe(true)
    expect(calls.some((c) => c.includes('Challenge Task'))).toBe(true)
  })

  it('outputs JSON with all three task sources', async () => {
    const cmd = await getSubCmd('formats')
    await cmd.run?.({ args: { json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as Array<{ taskSource: string }>
    const sources = data.map((d) => d.taskSource)
    expect(sources).toContain('lens')
    expect(sources).toContain('workflow')
    expect(sources).toContain('challenge')
  })
})

describe('battle challenge-types', () => {
  it('lists all challenge types in table format', async () => {
    const cmd = await getSubCmd('challenge-types')
    await cmd.run?.({
      args: { 'contender-structure': '', available: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintTable).toHaveBeenCalled()
    const [headers, rows] = mockPrintTable.mock.calls[0]
    expect(headers).toEqual(['ID', 'LABEL', 'OUTPUT', 'TIME', 'STATUS', 'CONTENDERS'])
    // At least the 3 implemented types
    expect(rows.length).toBeGreaterThanOrEqual(3)
  })

  it('filters by --contender-structure', async () => {
    const cmd = await getSubCmd('challenge-types')
    await cmd.run?.({
      args: { 'contender-structure': 'human_vs_human', available: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    for (const row of rows) {
      // CONTENDERS column should include human_vs_human
      expect(row[5]).toContain('human_vs_human')
    }
  })

  it('filters by --available to only implemented types', async () => {
    const cmd = await getSubCmd('challenge-types')
    await cmd.run?.({
      args: { 'contender-structure': '', available: true, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintTable).toHaveBeenCalled()
    const rows = mockPrintTable.mock.calls[0][1] as string[][]
    for (const row of rows) {
      expect(row[4]).toBe('ready')
    }
  })

  it('rejects invalid --contender-structure', async () => {
    const cmd = await getSubCmd('challenge-types')
    await cmd.run?.({
      args: { 'contender-structure': 'invalid_contender', available: false, json: false },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalled()
    expect(mockPrintTable).not.toHaveBeenCalled()
  })

  it('outputs JSON when --json flag is set', async () => {
    const cmd = await getSubCmd('challenge-types')
    await cmd.run?.({
      args: { 'contender-structure': '', available: false, json: true },
      cmd: {},
      rawArgs: [],
    })

    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as Array<{ id: string }>
    expect(data.length).toBeGreaterThanOrEqual(3)
    expect(data.some((d) => d.id === 'writing_contest')).toBe(true)
  })
})

describe('battle explain-invalid', () => {
  it('reports valid combination', async () => {
    const cmd = await getSubCmd('explain-invalid')
    await cmd.run?.({
      args: {
        'task-source': 'lens',
        'contender-structure': 'ai_vs_ai',
        'judging-mode': 'community_vote',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(consolaSuccess).toHaveBeenCalledWith('Combination is valid.')
  })

  it('reports invalid task-source ↔ contender-structure', async () => {
    const cmd = await getSubCmd('explain-invalid')
    await cmd.run?.({
      args: {
        'task-source': 'workflow',
        'contender-structure': 'human_vs_human',
        'judging-mode': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalledWith('Combination is invalid:')
  })

  it('reports invalid contender-structure ↔ judging-mode', async () => {
    const cmd = await getSubCmd('explain-invalid')
    await cmd.run?.({
      args: {
        'task-source': 'lens',
        'contender-structure': 'ai_vs_ai',
        'judging-mode': 'auto_score',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalledWith('Combination is invalid:')
  })

  it('outputs JSON for invalid combination with exit code 1', async () => {
    const cmd = await getSubCmd('explain-invalid')
    await cmd.run?.({
      args: {
        'task-source': 'workflow',
        'contender-structure': 'human_vs_human',
        'judging-mode': '',
        json: true,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as { valid: boolean; reasons: unknown[] }
    expect(data.valid).toBe(false)
    expect(data.reasons.length).toBeGreaterThan(0)
  })
})

describe('battle validate (V2 mode)', () => {
  it('validates a valid V2 lens + ai_vs_ai + community_vote combination', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'lens',
        'contender-structure': 'ai_vs_ai',
        'judging-mode': 'community_vote',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(consolaSuccess).toHaveBeenCalledWith('V2 configuration is valid.')
  })

  it('rejects V2 when only partial axes are provided', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'lens',
        'contender-structure': '',
        'judging-mode': '',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalled()
  })

  it('returns V2 violations for invalid challenge + workflow combination', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'workflow',
        'contender-structure': 'human_vs_human',
        'judging-mode': 'community_vote',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: true,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as { valid: boolean; mode: string }
    expect(data.valid).toBe(false)
    expect(data.mode).toBe('v2')
  })

  it('validates AI judge as judging mode (not contender structure)', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'lens',
        'contender-structure': 'human_vs_human',
        'judging-mode': 'ai_judge',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(consolaSuccess).toHaveBeenCalledWith('V2 configuration is valid.')
  })

  it('rejects challenge task without challenge-type', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'challenge',
        'contender-structure': 'human_vs_human',
        'judging-mode': 'community_vote',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: true,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as { valid: boolean; mode: string }
    expect(data.valid).toBe(false)
    expect(data.mode).toBe('v2')
  })

  it('reports V2 violations for challenge with writing_contest missing generator config', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': 'challenge',
        'contender-structure': 'human_vs_human',
        'judging-mode': 'community_vote',
        'challenge-type': 'writing_contest',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: true,
      },
      cmd: {},
      rawArgs: [],
    })

    // Should fail because writing_contest requires generator config
    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as { valid: boolean; mode: string }
    expect(data.valid).toBe(false)
    expect(data.mode).toBe('v2')
  })
})

describe('battle validate (legacy V1 mode)', () => {
  it('requires --format and --type when no V2 flags', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': '',
        'contender-structure': '',
        'judging-mode': '',
        'challenge-type': '',
        format: '',
        type: '',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(consolaError).toHaveBeenCalled()
  })

  it('validates a valid lens + ai_vs_ai legacy combination', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': '',
        'contender-structure': '',
        'judging-mode': '',
        'challenge-type': '',
        format: 'lens',
        type: 'ai_vs_ai',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: false,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(0)
    expect(consolaSuccess).toHaveBeenCalledWith('Configuration is valid.')
  })

  it('returns V1 violations in JSON mode', async () => {
    const cmd = await getSubCmd('validate')
    await cmd.run?.({
      args: {
        'task-source': '',
        'contender-structure': '',
        'judging-mode': '',
        'challenge-type': '',
        format: 'workflow',
        type: 'human_vs_human_open_votes',
        'content-type': '',
        'memory-mode': '',
        'instruction-disclosure': '',
        json: true,
      },
      cmd: {},
      rawArgs: [],
    })

    expect(process.exitCode).toBe(1)
    expect(mockPrintJson).toHaveBeenCalledTimes(1)
    const data = mockPrintJson.mock.calls[0][0] as { valid: boolean; mode: string }
    expect(data.valid).toBe(false)
    expect(data.mode).toBe('v1')
  })
})
