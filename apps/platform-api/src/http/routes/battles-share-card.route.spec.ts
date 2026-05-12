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
 * Helper that builds a minimal supabase client mock supporting the rpc call
 * shape used by the route:
 *   client.rpc('fn_get_battle_by_slug', { p_slug })
 *   client.rpc('fn_get_battle_share_card', { p_battle_id })
 */
interface RpcResult {
  data: unknown
  error: { message: string } | null
}

interface ShareCardHandlers {
  slugRows?: RpcResult
  cardRows?: RpcResult
}

function buildSupabaseMock(handlers: ShareCardHandlers) {
  return {
    rpc: jest.fn(async (fnName: string) => {
      if (fnName === 'fn_get_battle_by_slug') {
        return handlers.slugRows ?? { data: [], error: null }
      }
      if (fnName === 'fn_get_battle_share_card') {
        return handlers.cardRows ?? { data: [], error: null }
      }
      return { data: null, error: null }
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
        slugRows: {
          data: [
            {
              id: 'battle-1',
              slug: 'epic-clash',
              status: 'voting',
              deleted_at: null,
            },
          ],
          error: null,
        },
        cardRows: {
          data: [
            {
              title: 'Epic Clash',
              status: 'voting',
              total_votes: 12,
              contenders: [
                { id: 'c-a', slot: 'A', display_name: 'Alice', is_winner: false, elo_delta: null },
                { id: 'c-b', slot: 'B', display_name: 'Bob', is_winner: false, elo_delta: null },
              ],
            },
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
        slugRows: { data: [], error: null },
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
