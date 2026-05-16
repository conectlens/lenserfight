import { googleVeoAdapter } from '../google-veo'
import { mockFetch, resetFetchMock } from '../testing'

const AI_STUDIO_PREDICT_URL = /generativelanguage\.googleapis\.com.*predictLongRunning/
const VERTEX_PREDICT_URL = /aiplatform\.googleapis\.com.*predictLongRunning/
const POLL_URL = /(generativelanguage|aiplatform)\.googleapis\.com.*operations/

const AI_STUDIO_KEY = 'AIzaSyAabcdefghijklmnopqrstuvwxyz012345'
const VERTEX_TOKEN = 'ya29.fake-oauth-token'

describe('googleVeoAdapter — AI Studio path (default, API key only)', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('routes to generativelanguage.googleapis.com when no project is set', async () => {
    spy = mockFetch([
      { url: AI_STUDIO_PREDICT_URL, response: { name: 'operations/op-ai-studio-1' } },
    ])
    const result = await googleVeoAdapter.generate(AI_STUDIO_KEY, 'veo-2', 'ocean', {})
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toContain('ai-studio|')
    }
  })

  it('does NOT require project parameter on the AI Studio path', async () => {
    spy = mockFetch([
      { url: AI_STUDIO_PREDICT_URL, response: { name: 'operations/op-1' } },
    ])
    await expect(
      googleVeoAdapter.generate(AI_STUDIO_KEY, 'veo-2', 'x', {}),
    ).resolves.toMatchObject({ status: 'pending' })
  })
})

describe('googleVeoAdapter — Vertex AI path (when project is set)', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('routes to aiplatform.googleapis.com when project is set', async () => {
    spy = mockFetch([
      { url: VERTEX_PREDICT_URL, response: { name: 'projects/p/locations/us-central1/operations/op-vertex' } },
    ])
    const result = await googleVeoAdapter.generate(VERTEX_TOKEN, 'veo-2', 'ocean', {
      project: 'p', region: 'us-central1',
    })
    if (result.status === 'pending') {
      expect(result.providerTaskId.startsWith('vertex:us-central1|')).toBe(true)
    }
  })
})

describe('googleVeoAdapter — pollTask', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('returns completed with video URI when done=true', async () => {
    spy = mockFetch([
      {
        url: POLL_URL,
        response: {
          done: true,
          response: {
            generateVideoResponse: { generatedSamples: [{ video: { uri: 'gs://bucket/v.mp4' } }] },
          },
        },
      },
    ])
    const result = await googleVeoAdapter.pollTask!(AI_STUDIO_KEY, 'ai-studio|operations/op-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('gs://bucket/v.mp4')
    }
  })

  it('returns pending when done=false', async () => {
    spy = mockFetch([{ url: POLL_URL, response: { done: false } }])
    const result = await googleVeoAdapter.pollTask!(AI_STUDIO_KEY, 'ai-studio|operations/op-2')
    expect(result.status).toBe('pending')
  })

  it('returns failed when error is set', async () => {
    spy = mockFetch([
      { url: POLL_URL, response: { done: true, error: { message: 'quota exceeded' } } },
    ])
    const result = await googleVeoAdapter.pollTask!(AI_STUDIO_KEY, 'ai-studio|operations/op-3')
    expect(result.status).toBe('failed')
  })
})
