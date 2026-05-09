jest.mock('../../lib/supabase', () => ({
  createUserSupabaseClient: jest.fn(),
}))

import type { IncomingMessage, ServerResponse } from 'node:http'
import { EventEmitter } from 'node:events'
import { createUserSupabaseClient } from '../../lib/supabase'
import { handleRunsSseRoute } from './runs-sse.route'

const mockCreate = createUserSupabaseClient as jest.MockedFunction<typeof createUserSupabaseClient>

function buildSseResponse() {
  const written: string[] = []
  let statusCode = 200
  const headers: Record<string, string> = {}
  const emitter = new EventEmitter()

  const res = {
    writeHead: (code: number, hdrs?: Record<string, string>) => {
      statusCode = code
      Object.assign(headers, hdrs ?? {})
    },
    write: (chunk: string) => {
      written.push(chunk)
    },
    end: () => {},
    on: (event: string, cb: () => void) => emitter.on(event, cb),
  } as unknown as ServerResponse

  return {
    res,
    written,
    getStatus: () => statusCode,
    getHeader: (k: string) => headers[k],
    closeClient: () => emitter.emit('close'),
  }
}

function buildReq(token?: string): IncomingMessage {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
    on: () => {},
  } as unknown as IncomingMessage
}

const RUN_ID = 'run-abc-123'

describe('GET /v1/runs/:runId/events (SSE)', () => {
  beforeEach(() => jest.resetAllMocks())

  it('returns 401 when no bearer token is provided', async () => {
    const { res, getStatus } = buildSseResponse()
    const req = buildReq()

    // Override writeHead to capture 401
    let capturedStatus = 0
    ;(res as unknown as { writeHead: (c: number) => void }).writeHead = (code: number) => {
      capturedStatus = code
    }
    ;(res as unknown as { end: (b: string) => void }).end = () => {}

    await handleRunsSseRoute(req, res, RUN_ID)
    expect(capturedStatus).toBe(401)
  })

  it('sends text/event-stream header and emits done event for a completed run', async () => {
    const schemaFn = jest.fn().mockReturnThis()
    const fromFn = jest.fn().mockReturnThis()
    const selectFn = jest.fn().mockReturnThis()
    const eqFn = jest.fn().mockReturnThis()
    const gtFn = jest.fn().mockReturnThis()
    const orderFn = jest.fn().mockResolvedValue({ data: [], error: null })
    const rpcFn = jest.fn().mockResolvedValue({ data: [{ status: 'completed' }], error: null })

    mockCreate.mockReturnValue({
      schema: schemaFn.mockReturnValue({
        from: fromFn.mockReturnValue({
          select: selectFn.mockReturnValue({
            eq: eqFn.mockReturnValue({
              gt: gtFn.mockReturnValue({
                order: orderFn,
              }),
            }),
          }),
        }),
      }),
      rpc: rpcFn,
    } as never)

    const { res, written, getHeader } = buildSseResponse()
    const req = buildReq('test-token')

    await handleRunsSseRoute(req, res, RUN_ID)

    expect(getHeader('Content-Type')).toContain('text/event-stream')
    const combined = written.join('')
    expect(combined).toContain('event: done')
    expect(combined).toContain('"status":"completed"')
  })
})
