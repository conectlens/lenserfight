jest.mock('../../lib/supabase', () => ({
  createServiceSupabaseClient: jest.fn(),
}))

import type { IncomingMessage, ServerResponse } from 'node:http'
import { createServiceSupabaseClient } from '../../lib/supabase'
import { handleHealthRoute } from './health.route'

const mockCreate = createServiceSupabaseClient as jest.MockedFunction<typeof createServiceSupabaseClient>

function buildResponse(): { res: ServerResponse; getStatus: () => number; getJson: () => unknown } {
  let statusCode = 0
  let body = ''
  const headers: Record<string, string> = {}
  const res = {
    statusCode: 0,
    setHeader: (k: string, v: string) => {
      headers[k] = v
    },
    end: (chunk?: string) => {
      body = chunk ?? ''
    },
    get statusCode_() {
      return statusCode
    },
  } as unknown as ServerResponse & { statusCode: number }

  Object.defineProperty(res, 'statusCode', {
    get: () => statusCode,
    set: (v: number) => {
      statusCode = v
    },
  })

  return {
    res,
    getStatus: () => statusCode,
    getJson: () => (body ? JSON.parse(body) : null),
  }
}

const stubReq = {} as IncomingMessage

describe('GET /health', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 200 with status=ok when fn_health resolves to 1', async () => {
    mockCreate.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: 1, error: null }),
    } as never)

    const { res, getStatus, getJson } = buildResponse()
    await handleHealthRoute(stubReq, res)

    expect(getStatus()).toBe(200)
    const body = getJson() as { status: string; db: boolean }
    expect(body.status).toBe('ok')
    expect(body.db).toBe(true)
  })

  it('returns 503 with status=degraded when the rpc errors', async () => {
    mockCreate.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } }),
    } as never)

    const { res, getStatus, getJson } = buildResponse()
    await handleHealthRoute(stubReq, res)

    expect(getStatus()).toBe(503)
    const body = getJson() as { status: string; db: boolean; reason: string }
    expect(body.status).toBe('degraded')
    expect(body.db).toBe(false)
    expect(body.reason).toBe('connection refused')
  })

  it('returns 503 with reason=unexpected_health_value when fn_health does not return 1', async () => {
    mockCreate.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: 0, error: null }),
    } as never)

    const { res, getStatus, getJson } = buildResponse()
    await handleHealthRoute(stubReq, res)

    expect(getStatus()).toBe(503)
    const body = getJson() as { status: string; reason: string }
    expect(body.reason).toBe('unexpected_health_value')
  })
})
