import { sunoAdapter } from '../suno'
import { mockFetch, resetFetchMock } from '../testing'

describe('sunoAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate returns pending with task id', async () => {
    spy = mockFetch([
      {
        url: /api\.sunoapi\.org\/api\/generate/,
        response: { id: 'suno-clip-1', status: 'submitted' },
      },
    ])

    const result = await sunoAdapter.generate('suno-key', 'suno-v5', 'jazz improv', {})
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId ?? (result as { taskId?: string }).taskId).toBeTruthy()
    }
  })

  it('pollTask returns completed with audio URL', async () => {
    spy = mockFetch([
      {
        url: /api\.sunoapi\.org\/api\/get/,
        response: {
          clips: [{ id: 'suno-clip-1', status: 'complete', audio_url: 'https://suno.ai/clip.mp3', duration: 30 }],
        },
      },
    ])

    const result = await sunoAdapter.pollTask!('suno-key', 'suno-clip-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('https://suno.ai/clip.mp3')
    }
  })

  it('throws on expired API key (403)', async () => {
    spy = mockFetch([
      {
        url: /api\.sunoapi\.org\/api\/generate/,
        response: { error: 'Unauthorized' },
        status: 403,
      },
    ])

    await expect(sunoAdapter.generate('expired-key', 'suno-v5', 'test', {})).rejects.toThrow()
  })
})
