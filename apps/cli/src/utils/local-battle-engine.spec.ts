import { mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

jest.mock('@lenserfight/providers', () => ({
  byokKeyResolver: {
    resolve: jest.fn().mockReturnValue('test-key'),
    has: jest.fn().mockReturnValue(false),
  },
  getStreamAdapter: jest.fn(),
}))

const TEST_DIR = join(tmpdir(), `lf-test-${Date.now()}`)

// Patch process.cwd() so the store writes to our temp dir
const originalCwd = process.cwd
const originalKey = process.env.LENSERFIGHT_LOCAL_BATTLE_KEY
const originalRuntimeDir = process.env.LENSERFIGHT_RUNTIME_DIR
beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
  jest.spyOn(process, 'cwd').mockReturnValue(TEST_DIR)
  // Set a deterministic encryption passphrase for round-trip writes/reads.
  process.env.LENSERFIGHT_LOCAL_BATTLE_KEY = 'test-key-for-local-battle-encryption'
  process.env.LENSERFIGHT_RUNTIME_DIR = join(TEST_DIR, 'runtime')
})

afterAll(() => {
  process.cwd = originalCwd
  if (originalKey === undefined) delete process.env.LENSERFIGHT_LOCAL_BATTLE_KEY
  else process.env.LENSERFIGHT_LOCAL_BATTLE_KEY = originalKey
  if (originalRuntimeDir === undefined) delete process.env.LENSERFIGHT_RUNTIME_DIR
  else process.env.LENSERFIGHT_RUNTIME_DIR = originalRuntimeDir
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
})

// Import after mock so the store picks up the mocked cwd
import { LocalBattleStore, localBattleStore } from './local-battle-engine'

describe('LocalBattleStore.create', () => {
  it('creates a battle with valid JSON and status=draft', () => {
    const battle = localBattleStore.create('Test Battle', 'Write a haiku about AI')
    expect(battle.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(battle.status).toBe('draft')
    expect(battle.name).toBe('Test Battle')
    expect(battle.task).toBe('Write a haiku about AI')
    expect(battle.outputs).toEqual({ A: '', B: '' })
    expect(battle.votes).toEqual([])
    expect(battle.contenders).toEqual([])
  })

  it('persists to disk and can be loaded back', () => {
    const created = localBattleStore.create('Persist Test', 'Task A')
    const loaded = localBattleStore.load(created.id)
    expect(loaded.id).toBe(created.id)
    expect(loaded.status).toBe('draft')
  })
})

describe('LocalBattleStore.list', () => {
  it('returns battles sorted by creation date (newest first)', async () => {
    const store = new LocalBattleStore()
    const b1 = store.create('Alpha', 'Task')
    // Ensure at least 1 ms separates the two createdAt timestamps
    await new Promise((r) => setTimeout(r, 2))
    const b2 = store.create('Beta', 'Task')
    const list = store.list()
    const ids = list.map((b) => b.id)
    // Beta (b2) was created after Alpha (b1) → should be first
    expect(ids.indexOf(b2.id)).toBeLessThan(ids.indexOf(b1.id))
  })

  it('returns empty list when directory does not exist', () => {
    const store = new LocalBattleStore()
    const previousRuntimeDir = process.env.LENSERFIGHT_RUNTIME_DIR
    process.env.LENSERFIGHT_RUNTIME_DIR = join(TEST_DIR, 'missing-runtime')
    try {
      // Point both the primary runtime dir and legacy cwd path to locations with no battles.
      jest.spyOn(process, 'cwd').mockReturnValueOnce('/nonexistent-path-xyz')
      const list = store.list()
      expect(list).toEqual([])
    } finally {
      if (previousRuntimeDir === undefined) delete process.env.LENSERFIGHT_RUNTIME_DIR
      else process.env.LENSERFIGHT_RUNTIME_DIR = previousRuntimeDir
    }
  })
})

describe('LocalBattleStore.addContender + status transition', () => {
  it('transitions from draft to ready when both A and B are added', () => {
    const store = new LocalBattleStore()
    const battle = store.create('Ready Test', 'Task')
    store.addContender(battle.id, { slot: 'A', label: 'GPT-4', provider: 'openai', model: 'gpt-4' })
    const afterA = store.load(battle.id)
    expect(afterA.status).toBe('draft') // still draft — B missing

    store.addContender(battle.id, { slot: 'B', label: 'Claude', provider: 'anthropic', model: 'claude-3-opus-20240229' })
    const afterB = store.load(battle.id)
    expect(afterB.status).toBe('ready')
  })
})

describe('LocalBattleStore.markExecuted', () => {
  it('records outputs and transitions to executed', () => {
    const store = new LocalBattleStore()
    const battle = store.create('Exec Test', 'Task')
    store.addContender(battle.id, { slot: 'A', label: 'A', provider: 'openai', model: 'gpt-4' })
    store.addContender(battle.id, { slot: 'B', label: 'B', provider: 'anthropic', model: 'claude-3-opus-20240229' })
    store.markExecuted(battle.id, { A: 'Output A', B: 'Output B' })
    const loaded = store.load(battle.id)
    expect(loaded.status).toBe('executed')
    expect(loaded.outputs.A).toBe('Output A')
    expect(loaded.outputs.B).toBe('Output B')
    expect(loaded.executedAt).toBeTruthy()
  })
})

describe('LocalBattleStore.resolve', () => {
  it('resolves battle by UUID prefix', () => {
    const store = new LocalBattleStore()
    const battle = store.create('Prefix Test', 'Task')
    const resolved = store.resolve(battle.id.slice(0, 8))
    expect(resolved.id).toBe(battle.id)
  })

  it('throws when prefix matches nothing', () => {
    const store = new LocalBattleStore()
    expect(() => store.resolve('xxxxxxxx')).toThrow('Local battle not found')
  })
})

describe('LocalBattleStore.recordVote', () => {
  it('appends vote and transitions executed→voted', () => {
    const store = new LocalBattleStore()
    const battle = store.create('Vote Test', 'Task')
    store.addContender(battle.id, { slot: 'A', label: 'A', provider: 'openai', model: 'gpt-4' })
    store.addContender(battle.id, { slot: 'B', label: 'B', provider: 'anthropic', model: 'claude-3-haiku-20240307' })
    store.markExecuted(battle.id, { A: 'output A', B: 'output B' })

    const after = store.recordVote(battle.id, { slot: 'A', votedAt: new Date().toISOString() })
    expect(after.status).toBe('voted')
    expect(after.votes).toHaveLength(1)
    expect(after.votes[0].slot).toBe('A')
  })

  it('accumulates multiple votes without deduplication (caller controls uniqueness)', () => {
    const store = new LocalBattleStore()
    const battle = store.create('Multi Vote Test', 'Task')
    store.addContender(battle.id, { slot: 'A', label: 'A', provider: 'openai', model: 'gpt-4' })
    store.addContender(battle.id, { slot: 'B', label: 'B', provider: 'anthropic', model: 'claude-3-haiku-20240307' })
    store.markExecuted(battle.id, { A: 'output A', B: 'output B' })

    store.recordVote(battle.id, { slot: 'A', rationale: 'better', votedAt: new Date().toISOString() })
    const after = store.recordVote(battle.id, { slot: 'B', votedAt: new Date().toISOString() })
    expect(after.votes).toHaveLength(2)
  })
})

// ─── LocalAiJudge ────────────────────────────────────────────────────────────

import { LocalAiJudge } from './local-battle-engine'

const { byokKeyResolver: bkr, getStreamAdapter: gsa } = jest.requireMock('@lenserfight/providers') as {
  byokKeyResolver: { resolve: jest.Mock; has: jest.Mock }
  getStreamAdapter: jest.Mock
}

function makeBattleStateForJudge(): import('./local-battle-engine').LocalBattleState {
  return {
    id: 'judge-test-id',
    name: 'Judge Test Battle',
    task: 'Write a haiku about TypeScript',
    status: 'executed',
    contenders: [
      { slot: 'A', label: 'claude', provider: 'anthropic', model: 'claude-haiku-4-5' },
      { slot: 'B', label: 'gpt4o',  provider: 'openai',    model: 'gpt-4o-mini' },
    ],
    outputs: { A: 'Types guard each edge —', B: 'Semicolons fade at last.' },
    votes: [],
    createdAt: '2026-05-10T00:00:00.000Z',
  }
}

/** Build a minimal SSE stream that emits one text chunk then signals done. */
function makeJudgeSseResponse(text: string): Response {
  const encoder = new TextEncoder()
  const chunks = [
    `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":${JSON.stringify(text)}}}\n\n`,
    `event: message_stop\ndata: {"type":"message_stop"}\n\n`,
  ]
  let i = 0
  const stream = new ReadableStream({
    pull(controller) {
      if (i < chunks.length) controller.enqueue(encoder.encode(chunks[i++]))
      else controller.close()
    },
  })
  return new Response(stream, { status: 200 })
}

function setupJudgeAdapter(responseText: string) {
  gsa.mockReturnValue({
    buildStreamRequest: jest.fn().mockReturnValue({
      url: 'https://api.anthropic.com/v1/messages',
      body: '{}',
      headers: { 'content-type': 'application/json' },
    }),
    authHeader: jest.fn().mockReturnValue({ 'x-api-key': 'test-key' }),
    parseStreamChunk: jest.fn().mockImplementation((line: string) => {
      if (!line.startsWith('data: ')) return null
      try {
        const d = JSON.parse(line.slice(6))
        if (d?.delta?.text) return { content: d.delta.text, done: false }
        if (d?.type === 'message_stop') return { content: '', done: true }
      } catch { /* ignore */ }
      return null
    }),
  })
  global.fetch = jest.fn().mockResolvedValue(makeJudgeSseResponse(responseText))
}

describe('LocalAiJudge.resolveJudgeProvider', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns anthropic when ANTHROPIC_API_KEY is available', () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    expect(new LocalAiJudge().resolveJudgeProvider()).toEqual({ provider: 'anthropic', model: 'claude-haiku-4-5' })
  })

  it('falls back to openai when only OpenAI key is available', () => {
    bkr.has.mockImplementation((p: string) => p === 'openai')
    expect(new LocalAiJudge().resolveJudgeProvider()).toEqual({ provider: 'openai', model: 'gpt-4o-mini' })
  })

  it('falls back to ollama when only Ollama is available', () => {
    bkr.has.mockImplementation((p: string) => p === 'ollama')
    expect(new LocalAiJudge().resolveJudgeProvider()).toEqual({ provider: 'ollama', model: 'llama3.2' })
  })

  it('returns null when nothing is available', () => {
    bkr.has.mockReturnValue(false)
    expect(new LocalAiJudge().resolveJudgeProvider()).toBeNull()
  })

  it('prefers anthropic over openai when both are set', () => {
    bkr.has.mockReturnValue(true)
    expect(new LocalAiJudge().resolveJudgeProvider()?.provider).toBe('anthropic')
  })
})

describe('LocalAiJudge.judge — happy paths', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns winner A with rationale', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter(JSON.stringify({ winner: 'A', rationale: 'More precise haiku.' }))

    const result = await new LocalAiJudge().judge(makeBattleStateForJudge())
    expect(result.winner).toBe('A')
    expect(result.rationale).toBe('More precise haiku.')
    expect(result.provider).toBe('anthropic')
    expect(result.model).toBe('claude-haiku-4-5')
    expect(result.tokensUsed).toBeGreaterThan(0)
  })

  it('returns winner B', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter(JSON.stringify({ winner: 'B', rationale: 'Better imagery.' }))
    expect((await new LocalAiJudge().judge(makeBattleStateForJudge())).winner).toBe('B')
  })

  it('returns draw', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter(JSON.stringify({ winner: 'draw', rationale: 'Both equally strong.' }))
    expect((await new LocalAiJudge().judge(makeBattleStateForJudge())).winner).toBe('draw')
  })

  it('extracts JSON even when surrounded by prose', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter('Here is my verdict: {"winner":"A","rationale":"Cleaner."} — done!')
    expect((await new LocalAiJudge().judge(makeBattleStateForJudge())).winner).toBe('A')
  })

  it('caps rationale at 1000 chars', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter(JSON.stringify({ winner: 'A', rationale: 'x'.repeat(2000) }))
    const result = await new LocalAiJudge().judge(makeBattleStateForJudge())
    expect(result.rationale.length).toBe(1000)
  })
})

describe('LocalAiJudge.judge — error handling', () => {
  beforeEach(() => jest.clearAllMocks())

  it('throws when no provider is available', async () => {
    bkr.has.mockReturnValue(false)
    await expect(new LocalAiJudge().judge(makeBattleStateForJudge())).rejects.toThrow('No provider key available')
  })

  it('throws when provider returns non-200', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    gsa.mockReturnValue({
      buildStreamRequest: jest.fn().mockReturnValue({ url: 'https://api.anthropic.com/v1/messages', body: '{}', headers: {} }),
      authHeader: jest.fn().mockReturnValue({}),
      parseStreamChunk: jest.fn(),
    })
    global.fetch = jest.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }))
    await expect(new LocalAiJudge().judge(makeBattleStateForJudge())).rejects.toThrow('error 401')
  })

  it('throws when response contains no JSON', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter('Sorry, I cannot judge.')
    await expect(new LocalAiJudge().judge(makeBattleStateForJudge())).rejects.toThrow('no parseable JSON')
  })

  it('throws when winner value is not A, B, or draw', async () => {
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue('sk-test')
    setupJudgeAdapter(JSON.stringify({ winner: 'C', rationale: 'Invalid.' }))
    await expect(new LocalAiJudge().judge(makeBattleStateForJudge())).rejects.toThrow('unexpected winner')
  })

  it('does not expose API key in error messages', async () => {
    const secretKey = 'SECRET_KEY_THAT_MUST_NOT_LEAK'
    bkr.has.mockImplementation((p: string) => p === 'anthropic')
    bkr.resolve.mockReturnValue(secretKey)
    gsa.mockReturnValue({
      buildStreamRequest: jest.fn().mockReturnValue({ url: 'https://api.anthropic.com/v1/messages', body: '{}', headers: {} }),
      authHeader: jest.fn().mockReturnValue({ 'x-api-key': secretKey }),
      parseStreamChunk: jest.fn(),
    })
    global.fetch = jest.fn().mockResolvedValue(new Response('Bad request', { status: 400 }))
    let msg = ''
    try { await new LocalAiJudge().judge(makeBattleStateForJudge()) } catch (e) { msg = String(e) }
    expect(msg).not.toContain(secretKey)
  })
})

describe('LocalBattleLenser.run', () => {
  it('calls both contenders and returns output with A, B, tokensA, tokensB, durationMs', async () => {
    const { getStreamAdapter } = await import('@lenserfight/providers') as unknown as { getStreamAdapter: jest.Mock }

    const mockAdapter = {
      buildStreamRequest: jest.fn().mockReturnValue({
        url: 'https://example.com/stream',
        body: '{}',
        headers: { 'Content-Type': 'application/json' },
      }),
      authHeader: jest.fn().mockReturnValue({ Authorization: 'Bearer test-key' }),
      parseStreamChunk: jest.fn()
        .mockReturnValueOnce({ content: 'Hello', done: false })
        .mockReturnValueOnce({ content: ' world', done: true })
        .mockReturnValueOnce({ content: 'Goodbye', done: false })
        .mockReturnValueOnce({ content: '.', done: true }),
    }
    getStreamAdapter.mockReturnValue(mockAdapter)

    const sseBody = [
      'data: chunk1\n',
      'data: chunk2\n',
    ].join('')

    const mockReader = {
      read: jest.fn()
        .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode(sseBody) })
        .mockResolvedValue({ done: true, value: undefined }),
    }
    const mockResponse = {
      ok: true,
      body: { getReader: () => mockReader },
    }
    global.fetch = jest.fn().mockResolvedValue(mockResponse)

    const store = new LocalBattleStore()
    const battle = store.create('Lenser Test', 'Summarise this text')
    store.addContender(battle.id, { slot: 'A', label: 'GPT', provider: 'openai', model: 'gpt-4o-mini' })
    store.addContender(battle.id, { slot: 'B', label: 'Claude', provider: 'anthropic', model: 'claude-haiku-4-5' })
    const readyBattle = store.load(battle.id)

    const { LocalBattleLenser } = await import('./local-battle-engine')
    const lenser = new LocalBattleLenser()
    const tokens: string[] = []
    const result = await lenser.run(readyBattle, (slot, delta) => tokens.push(`${slot}:${delta}`))

    expect(result).toMatchObject({
      A: expect.any(String),
      B: expect.any(String),
      tokensA: expect.any(Number),
      tokensB: expect.any(Number),
      durationMs: expect.any(Number),
    })
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})
