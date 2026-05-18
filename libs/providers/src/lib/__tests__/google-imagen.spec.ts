import { googleImagenAdapter } from '../google-imagen'

const AI_STUDIO_URL = /generativelanguage\.googleapis\.com.*:predict\b/
const VERTEX_URL = /aiplatform\.googleapis\.com.*:predict\b/
const AI_STUDIO_KEY = 'AIzaSyAabcdefghijklmnopqrstuvwxyz012345' // 39 chars, AIza prefix
const VERTEX_TOKEN = 'ya29.fake-oauth-token-for-vertex'

function captureFetch(opts: {
  status?: number
  responseBody: object | string
  contentType?: string
}) {
  const { status = 200, responseBody, contentType = 'application/json' } = opts
  let captured: { url: string; headers: Record<string, string>; body: Record<string, unknown> | null } = {
    url: '',
    headers: {},
    body: null,
  }
  const spy = jest.spyOn(global, 'fetch').mockImplementation(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      captured.url = typeof input === 'string' ? input : input.toString()
      captured.headers = (init?.headers as Record<string, string>) ?? {}
      if (init?.body && typeof init.body === 'string') {
        try { captured.body = JSON.parse(init.body) as Record<string, unknown> } catch { /* */ }
      }
      const bodyStr = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody)
      return new Response(bodyStr, { status, headers: { 'Content-Type': contentType } })
    },
  )
  return {
    getCapture(): typeof captured { return captured },
    restore(): void { spy.mockRestore() },
  }
}

describe('googleImagenAdapter — AI Studio (Gemini API) path (default)', () => {
  let mock: ReturnType<typeof captureFetch>
  afterEach(() => mock?.restore())

  it('routes to generativelanguage.googleapis.com when no project is set', async () => {
    mock = captureFetch({
      responseBody: { predictions: [{ bytesBase64Encoded: 'aGVsbG8=', mimeType: 'image/png' }] },
    })
    const result = await googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-3.0-generate-002', 'a dog', {})
    expect(result.status).toBe('completed')
    const cap = mock.getCapture()
    expect(cap.url).toMatch(AI_STUDIO_URL)
    expect(cap.url).not.toMatch(/aiplatform/)
    expect(cap.headers['x-goog-api-key']).toBe(AI_STUDIO_KEY)
    expect(cap.headers).not.toHaveProperty('Authorization')
  })

  it('emits data URLs for completed predictions', async () => {
    mock = captureFetch({
      responseBody: { predictions: [{ bytesBase64Encoded: 'aGVsbG8=', mimeType: 'image/png' }] },
    })
    const result = await googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-4', 'a dog', {})
    if (result.status === 'completed') {
      expect(result.urls[0]).toMatch(/^data:image\/png;base64,/)
    }
  })

  it('NO LONGER throws "project required" when project is absent', async () => {
    mock = captureFetch({
      responseBody: { predictions: [{ bytesBase64Encoded: 'aGVsbG8=', mimeType: 'image/png' }] },
    })
    await expect(
      googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-4', 'a dog', {}),
    ).resolves.toMatchObject({ status: 'completed' })
  })
})

describe('googleImagenAdapter — Vertex AI path (opt-in via project)', () => {
  let mock: ReturnType<typeof captureFetch>
  afterEach(() => mock?.restore())

  it('routes to aiplatform.googleapis.com when project is set', async () => {
    mock = captureFetch({
      responseBody: { predictions: [{ bytesBase64Encoded: 'aGVsbG8=', mimeType: 'image/png' }] },
    })
    await googleImagenAdapter.generate(VERTEX_TOKEN, 'imagen-3.0-generate-002', 'a dog', {
      project: 'my-gcp-project',
      region: 'us-central1',
    })
    const cap = mock.getCapture()
    expect(cap.url).toMatch(VERTEX_URL)
    expect(cap.url).toContain('projects/my-gcp-project')
    expect(cap.headers.Authorization).toBe(`Bearer ${VERTEX_TOKEN}`)
  })

  it('rejects when project is set but an AI Studio key was supplied', async () => {
    mock = captureFetch({ responseBody: { predictions: [] } })
    await expect(
      googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-4', 'x', { project: 'p' }),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })
})

describe('googleImagenAdapter — error mapping', () => {
  let mock: ReturnType<typeof captureFetch>
  afterEach(() => mock?.restore())

  it('content_policy when predictions is empty (safety filter)', async () => {
    mock = captureFetch({ responseBody: { predictions: [] } })
    await expect(
      googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-4', 'flagged', {}),
    ).rejects.toMatchObject({ code: 'content_policy' })
  })

  it('maps 403 from AI Studio to permission_denied', async () => {
    mock = captureFetch({
      status: 403,
      responseBody: { error: { message: 'PERMISSION_DENIED', status: 'PERMISSION_DENIED' } },
    })
    await expect(
      googleImagenAdapter.generate(AI_STUDIO_KEY, 'imagen-4', 'x', {}),
    ).rejects.toMatchObject({ code: 'permission_denied' })
  })
})
