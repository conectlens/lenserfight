// Envelope handler registry — Phase CT tests
// Verifies dispatch semantics + JWT-gate invariants.

import { vi, afterEach, beforeAll, describe, it, expect } from 'vitest'

import { BattleCreateHandler } from './battle-create.handler'
import {
  EnvelopeHandlerRegistry,
  createDefaultEnvelopeRegistry,
} from './envelope-registry'
import { ScheduleTriggerHandler } from './schedule-trigger.handler'
import type { EnvelopeHandler, PostRunContext } from './types'

beforeAll(() => {
  process.env['SUPABASE_URL']              = 'https://test.supabase.co'
  process.env['SUPABASE_ANON_KEY']         = 'anon-key'
  process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'service-role-key'
})

function makeCtx(overrides: Partial<PostRunContext> = {}): PostRunContext {
  return {
    workflowRunId:          'run-123',
    workflowId:             'workflow-123',
    lenserId:               'lenser-123',
    supabaseUrl:            'https://test.supabase.co',
    supabaseAnonKey:        'anon-key',
    supabaseServiceRoleKey: 'service-role-key',
    ...overrides,
  }
}

function mockFetchSequence(
  responses: Array<{ status: number; body: unknown }>,
): ReturnType<typeof vi.fn> {
  const fn = vi.fn()
  responses.forEach(({ status, body }) => {
    fn.mockResolvedValueOnce({
      ok:         status >= 200 && status < 300,
      status,
      statusText: status === 200 ? 'OK' : 'Error',
      json:       () => Promise.resolve(body),
      text:       () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)),
    })
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

afterEach(() => vi.unstubAllGlobals())

// ─── Registry plumbing ───────────────────────────────────────────────────────

describe('EnvelopeHandlerRegistry', () => {
  it('starts empty when given no handlers', () => {
    expect(new EnvelopeHandlerRegistry().size()).toBe(0)
  })

  it('register() appends handlers', () => {
    const registry = new EnvelopeHandlerRegistry()
    const handler: EnvelopeHandler = {
      name: 'noop',
      matches: () => false,
      handle: async () => ({ handler: 'noop', handled: false }),
    }
    registry.register(handler)
    expect(registry.size()).toBe(1)
  })

  it('dispatch() skips handlers whose matches() returns false', async () => {
    const handler: EnvelopeHandler = {
      name: 'noop',
      matches: () => false,
      handle: vi.fn(),
    }
    const registry = new EnvelopeHandlerRegistry([handler])
    const outcomes = await registry.dispatch({ data: {} }, makeCtx())
    expect(outcomes).toHaveLength(0)
    expect(handler.handle).not.toHaveBeenCalled()
  })

  it('dispatch() reports handler errors as outcomes, never throws', async () => {
    const handler: EnvelopeHandler = {
      name: 'boom',
      matches: () => true,
      handle: async () => {
        throw new Error('handler failed')
      },
    }
    const registry = new EnvelopeHandlerRegistry([handler])
    const outcomes = await registry.dispatch({}, makeCtx())
    expect(outcomes).toEqual([
      { handler: 'boom', status: 'error', error: { message: 'handler failed' } },
    ])
  })

  it('dispatch() returns handled outcome when handler.handled === true', async () => {
    const handler: EnvelopeHandler = {
      name: 'pass',
      matches: () => true,
      handle: async () => ({ handler: 'pass', handled: true, data: { id: 'x' } }),
    }
    const registry = new EnvelopeHandlerRegistry([handler])
    const outcomes = await registry.dispatch({}, makeCtx())
    expect(outcomes).toEqual([
      {
        handler: 'pass',
        status:  'handled',
        result:  { handler: 'pass', handled: true, data: { id: 'x' } },
      },
    ])
  })

  it('createDefaultEnvelopeRegistry() wires both production handlers', () => {
    expect(createDefaultEnvelopeRegistry().size()).toBe(2)
  })
})

// ─── BattleCreateHandler ─────────────────────────────────────────────────────

describe('BattleCreateHandler', () => {
  const handler = new BattleCreateHandler()

  it('matches envelopes with __battle_create_request === true on the data sub-object', () => {
    expect(handler.matches({ data: { __battle_create_request: true } })).toBe(true)
    expect(handler.matches({ __battle_create_request: true })).toBe(true)
    expect(handler.matches({ data: { __battle_create_request: false } })).toBe(false)
    expect(handler.matches(null)).toBe(false)
  })

  it('throws when userJwt is missing — never falls back to service-role auth', async () => {
    await expect(
      handler.handle(
        { data: { __battle_create_request: true, title: 't', taskPrompt: 'p', battleType: 'ai_vs_ai' } },
        makeCtx(),
      ),
    ).rejects.toThrow(/requires an authenticated user context/)
  })

  it('calls fn_battles_create with the user JWT when present', async () => {
    const fn = mockFetchSequence([
      { status: 200, body: 'battle-abc' },
      { status: 201, body: '' }, // log insert
    ])

    const result = await handler.handle(
      { data: { __battle_create_request: true, title: 'Test', taskPrompt: 'P', battleType: 'ai_vs_ai' } },
      makeCtx({ userJwt: 'user-jwt-token' }),
    )

    expect(result.handled).toBe(true)
    expect(result.data?.['battleId']).toBe('battle-abc')

    const [createUrl, createInit] = fn.mock.calls[0]
    expect(createUrl).toContain('/rpc/fn_battles_create')
    expect((createInit as RequestInit).headers).toMatchObject({
      'Authorization': 'Bearer user-jwt-token',
    })
  })
})

// ─── ScheduleTriggerHandler ─────────────────────────────────────────────────

describe('ScheduleTriggerHandler', () => {
  const handler = new ScheduleTriggerHandler()

  it('matches envelopes with __schedule_trigger_request === true', () => {
    expect(handler.matches({ data: { __schedule_trigger_request: true } })).toBe(true)
    expect(handler.matches({ data: { __schedule_trigger_request: false } })).toBe(false)
  })

  it('upserts using the user JWT when available', async () => {
    const fn = mockFetchSequence([{ status: 200, body: [{ workflow_id: 'workflow-123' }] }])
    const result = await handler.handle(
      { data: { __schedule_trigger_request: true, cronExpression: '*/5 * * * *', timezone: 'UTC', enabled: true } },
      makeCtx({ userJwt: 'user-jwt-token' }),
    )
    expect(result.handled).toBe(true)
    expect(result.data?.['cronExpression']).toBe('*/5 * * * *')
    expect((fn.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'Authorization': 'Bearer user-jwt-token',
    })
  })

  it('falls back to the service-role key when no user JWT is available', async () => {
    const fn = mockFetchSequence([{ status: 200, body: [{ workflow_id: 'workflow-123' }] }])
    const result = await handler.handle(
      { data: { __schedule_trigger_request: true, cronExpression: '0 * * * *', timezone: 'UTC', enabled: true } },
      makeCtx(),
    )
    expect(result.handled).toBe(true)
    expect((fn.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      'Authorization': 'Bearer service-role-key',
    })
  })

  it('throws on upstream error response', async () => {
    mockFetchSequence([{ status: 500, body: 'db error' }])
    await expect(
      handler.handle(
        { data: { __schedule_trigger_request: true, cronExpression: '*/5 * * * *', timezone: 'UTC', enabled: true } },
        makeCtx({ userJwt: 'jwt' }),
      ),
    ).rejects.toThrow(/upsert returned 500/)
  })
})
