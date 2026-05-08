jest.mock('../../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServiceSupabaseClient } from '../../lib/supabase'
import { handleBattleShareCardRoute } from './battles-share-card.route'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>

interface CapturedResponse {
  res: ServerResponse
  getStatus: () => number
  getBody: () => string
  getHeader: (name: string) => string | undefined
}

function buildResponse(): CapturedResponse {
  let statusCode = 0
  let body = ''
  const headers: Record<string, string> = {}
  const res = {
    setHeader: (k: string, v: string) => {
      headers[k.toLowerCase()] = v
    },
    end: (chunk?: string) => {
      body = chunk ?? ''
    },
  } as unknown as ServerResponse

  Object.defineProperty(res, 'statusCode', {
    get: () => statusCode,
    set: (v: number) => {
      statusCode = v
    },
  })

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => body,
    getHeader: (name: string) => headers[name.toLowerCase()],
  }
}

const stubReq = {} as IncomingMessage

/**
 * Helper that builds a minimal supabase client mock supporting the chained
 * call shape used by the route:
 *   client.schema(s).from(t).select(...).eq(...).limit(...)
 *   client.schema(s).from(t).select(...).eq(...).order(...)
 */
interface QueryResult {
  data: unknown
  error: { message: string } | null
}

function buildSupabaseMock(handlers: {
  battle?: QueryResult
  contenders?: QueryResult
  elo?: QueryResult
}) {
  return {
    schema: (schemaName: string) => ({
      from: (table: string) => {
        const queryBuilder = {
          _result: { data: null as unknown, error: null as { message: string } | null } as QueryResult,
          select() {
            return queryBuilder
          },
          eq() {
            return queryBuilder
          },
          order() {
            return Promise.resolve(queryBuilder._result)
          },
          limit() {
            return Promise.resolve(queryBuilder._result)
          },
        }

        if (schemaName === 'battles' && table === 'battles') {
          queryBuilder._result = handlers.battle ?? { data: null, error: null }
        } else if (schemaName === 'battles' && table === 'contenders') {
          queryBuilder._result = handlers.contenders ?? { data: [], error: null }
        } else if (schemaName === 'reputation' && table === 'elo_battle_log') {
          queryBuilder._result = handlers.elo ?? { data: [], error: null }
        }

        return queryBuilder
      },
    }),
  }
}

describe('GET /v1/battles/:slug/share-card.svg', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 200 SVG with battle title when the battle exists', async () => {
    mockCreate.mockReturnValue(
      buildSupabaseMock({
        battle: {
          data: [
            {
              id: 'battle-1',
              slug: 'epic-clash',
              title: 'Epic Clash',
              status: 'voting',
              finalized_at: null,
              winner_contender_id: null,
              deleted_at: null,
              total_vote_count: 12,
            },
          ],
          error: null,
        },
        contenders: {
          data: [
            { id: 'c-a', slot: 'A', display_name: 'Alice' },
            { id: 'c-b', slot: 'B', display_name: 'Bob' },
          ],
          error: null,
        },
      }) as never,
    )

    const cap = buildResponse()
    await handleBattleShareCardRoute(stubReq, cap.res, ['v1', 'battles', 'epic-clash', 'share-card.svg'])

    expect(cap.getStatus()).toBe(200)
    expect(cap.getHeader('Content-Type')).toMatch(/image\/svg\+xml/)
    expect(cap.getHeader('Cache-Control')).toBe('public, max-age=300, s-maxage=600')
    const body = cap.getBody()
    expect(body).toContain('<svg')
    expect(body).toContain('Epic Clash')
    expect(body).toContain('Alice')
    expect(body).toContain('Bob')
    expect(body).toContain('lenserfight.com/battles/epic-clash')
  })

  it('returns 404 JSON when the battle slug does not resolve', async () => {
    mockCreate.mockReturnValue(
      buildSupabaseMock({
        battle: { data: [], error: null },
      }) as never,
    )

    const cap = buildResponse()
    await handleBattleShareCardRoute(stubReq, cap.res, [
      'v1',
      'battles',
      'missing',
      'share-card.svg',
    ])

    expect(cap.getStatus()).toBe(404)
    expect(cap.getHeader('Content-Type')).toMatch(/application\/json/)
    const parsed = JSON.parse(cap.getBody()) as { error: string }
    expect(parsed.error).toBe('not_found')
  })
})
