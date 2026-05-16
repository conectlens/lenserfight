import { googleLyriaAdapter } from '../google-lyria'
import { mockFetch, resetFetchMock } from '../testing'

const AI_STUDIO_PREDICT_URL = /generativelanguage\.googleapis\.com.*predictLongRunning/
const VERTEX_PREDICT_URL = /aiplatform\.googleapis\.com.*predictLongRunning/
const POLL_URL = /(generativelanguage|aiplatform)\.googleapis\.com.*operations/

const AI_STUDIO_KEY = 'AIzaSyAabcdefghijklmnopqrstuvwxyz012345'
const VERTEX_TOKEN = 'ya29.fake-oauth'

describe('googleLyriaAdapter — AI Studio path (default)', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('routes to AI Studio when no project is set', async () => {
    spy = mockFetch([
      { url: AI_STUDIO_PREDICT_URL, response: { name: 'operations/lyria-1' } },
    ])
    const result = await googleLyriaAdapter.generate(AI_STUDIO_KEY, 'lyria-2', 'lo-fi', {})
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toContain('ai-studio|')
    }
  })

  it('does not require project on AI Studio path', async () => {
    spy = mockFetch([
      { url: AI_STUDIO_PREDICT_URL, response: { name: 'operations/lyria-1' } },
    ])
    await expect(
      googleLyriaAdapter.generate(AI_STUDIO_KEY, 'lyria-2', 'x', {}),
    ).resolves.toMatchObject({ status: 'pending' })
  })
})

describe('googleLyriaAdapter — Vertex path (opt-in)', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('routes to Vertex when project is set', async () => {
    spy = mockFetch([
      { url: VERTEX_PREDICT_URL, response: { name: 'projects/p/operations/lyria-2' } },
    ])
    const result = await googleLyriaAdapter.generate(VERTEX_TOKEN, 'lyria-2', 'jazz', {
      project: 'p', region: 'us-central1',
    })
    if (result.status === 'pending') {
      expect(result.providerTaskId.startsWith('vertex:us-central1|')).toBe(true)
    }
  })
})

describe('googleLyriaAdapter — pollTask', () => {
  let spy: jest.SpyInstance
  afterEach(() => { if (spy) resetFetchMock(spy) })

  it('decodes base64 audioContent into data URI', async () => {
    const fakeB64 = Buffer.from('FAKE_MP3').toString('base64')
    spy = mockFetch([
      { url: POLL_URL, response: { done: true, response: { audioContent: fakeB64 } } },
    ])
    const result = await googleLyriaAdapter.pollTask!(AI_STUDIO_KEY, 'ai-studio|operations/lyria-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toMatch(/^data:audio\/mpeg;base64,/)
    }
  })
})
