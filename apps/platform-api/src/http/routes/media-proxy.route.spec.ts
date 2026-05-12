jest.mock('../../lib/auth/authenticate', () => ({
  authenticateRequest: jest.fn(),
}))
jest.mock('../../lib/storage', () => ({
  GeneratedMedia: { bucket: 'generated-media' },
  createGeneratedMediaSignedUrl: jest.fn(),
}))

import type { IncomingMessage, ServerResponse } from 'node:http'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { createGeneratedMediaSignedUrl } from '../../lib/storage'
import { handleMediaProxyRoute } from './media-proxy.route'

const mockAuth = authenticateRequest as jest.MockedFunction<typeof authenticateRequest>
const mockSign = createGeneratedMediaSignedUrl as jest.MockedFunction<typeof createGeneratedMediaSignedUrl>

interface CapturedResponse {
  res: ServerResponse
  getStatus: () => number
  getHeader: (key: string) => string | undefined
  getBody: () => unknown
}

function buildResponse(): CapturedResponse {
  let statusCode = 0
  let body = ''
  const headers: Record<string, string> = {}

  const res = {
    setHeader: (k: string, v: string) => {
      headers[k] = v
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
    getHeader: (key: string) => headers[key],
    getBody: () => (body ? JSON.parse(body) : null),
  }
}

const stubReq = { headers: { authorization: 'Bearer fake' } } as IncomingMessage

function buildAuthMock(rowOrError: { row?: Record<string, unknown> | null; error?: { message: string } }): unknown {
  const userRpc = jest.fn(async (fnName: string) => {
    if (fnName === 'fn_get_media_object') {
      if (rowOrError.error) return { data: null, error: rowOrError.error }
      return { data: rowOrError.row !== undefined ? [rowOrError.row] : null, error: null }
    }
    return { data: null, error: null }
  })
  const serviceRpc = jest.fn().mockResolvedValue({ error: null })
  return {
    accessToken: 'fake',
    user: { id: 'user-1' },
    userClient: { rpc: userRpc },
    serviceClient: { rpc: serviceRpc },
  }
}

describe('GET /v1/media/:objectId', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  it('returns 401 when no auth token is present', async () => {
    mockAuth.mockRejectedValueOnce(new Error('Missing bearer token'))

    const { res, getStatus, getBody } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(getStatus()).toBe(401)
    expect((getBody() as { error: { code: string } }).error.code).toBe('unauthorized')
  })

  it('returns 404 when RLS hides the row (data null, no error)', async () => {
    mockAuth.mockResolvedValueOnce(buildAuthMock({ row: null }) as never)

    const { res, getStatus, getBody } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(getStatus()).toBe(404)
    expect((getBody() as { error: { code: string } }).error.code).toBe('not_found')
  })

  it('returns 410 when lifecycle_state is not active', async () => {
    mockAuth.mockResolvedValueOnce(
      buildAuthMock({
        row: {
          id: 'media-1',
          bucket: 'generated-media',
          object_key: 'sync/run-1.png',
          external_url: null,
          mime_type: 'image/png',
          visibility: 'private',
          lifecycle_state: 'deleted',
        },
      }) as never,
    )

    const { res, getStatus, getBody } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(getStatus()).toBe(410)
    expect((getBody() as { error: { code: string } }).error.code).toBe('media_gone')
  })

  it('redirects 302 to external_url when present', async () => {
    mockAuth.mockResolvedValueOnce(
      buildAuthMock({
        row: {
          id: 'media-1',
          bucket: 'generated-media',
          object_key: 'async/run-1.png',
          external_url: 'https://provider.example/img.png',
          mime_type: 'image/png',
          visibility: 'private',
          lifecycle_state: 'active',
        },
      }) as never,
    )

    const { res, getStatus, getHeader } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(getStatus()).toBe(302)
    expect(getHeader('Location')).toBe('https://provider.example/img.png')
    expect(mockSign).not.toHaveBeenCalled()
  })

  it('redirects 302 to a signed URL for internal bucket objects', async () => {
    mockAuth.mockResolvedValueOnce(
      buildAuthMock({
        row: {
          id: 'media-1',
          bucket: 'generated-media',
          object_key: 'sync/run-1.png',
          external_url: null,
          mime_type: 'image/png',
          visibility: 'private',
          lifecycle_state: 'active',
        },
      }) as never,
    )
    mockSign.mockResolvedValueOnce('https://supabase.local/storage/v1/object/sign/abc')

    const { res, getStatus, getHeader } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(mockSign).toHaveBeenCalledWith(
      expect.anything(),
      'sync/run-1.png',
      expect.objectContaining({ expiresIn: 3600 }),
    )
    expect(getStatus()).toBe(302)
    expect(getHeader('Location')).toContain('storage/v1/object/sign')
  })

  it('returns 400 for buckets other than generated-media', async () => {
    mockAuth.mockResolvedValueOnce(
      buildAuthMock({
        row: {
          id: 'media-1',
          bucket: 'user-media',
          object_key: 'something/else.png',
          external_url: null,
          mime_type: 'image/png',
          visibility: 'private',
          lifecycle_state: 'active',
        },
      }) as never,
    )

    const { res, getStatus, getBody } = buildResponse()
    await handleMediaProxyRoute(stubReq, res, 'media-1', 'req-1', Date.now())

    expect(getStatus()).toBe(400)
    expect((getBody() as { error: { code: string } }).error.code).toBe('unsupported_bucket')
  })
})
