import { googleVeoAdapter } from '../google-veo'
import { mockFetch, resetFetchMock } from '../testing'

const PREDICT_URL = /aiplatform\.googleapis\.com.*predictLongRunning/
const OPERATIONS_URL = /aiplatform\.googleapis\.com.*operations/

describe('googleVeoAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate returns pending with providerTaskId (operation name)', async () => {
    spy = mockFetch([
      {
        url: PREDICT_URL,
        response: { name: 'projects/p/locations/us-central1/operations/op-123' },
      },
    ])

    const result = await googleVeoAdapter.generate('tok', 'veo-2', 'ocean waves', {
      project: 'p',
      region: 'us-central1',
    })
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toMatch(/op-123/)
    }
  })

  it('pollTask returns completed with video URI when done=true', async () => {
    spy = mockFetch([
      {
        url: OPERATIONS_URL,
        response: {
          done: true,
          response: {
            generateVideoResponse: {
              generatedSamples: [{ video: { uri: 'gs://bucket/video.mp4' } }],
            },
          },
        },
      },
    ])

    const result = await googleVeoAdapter.pollTask!('tok', 'projects/p/operations/op-123')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('gs://bucket/video.mp4')
    }
  })

  it('pollTask returns pending when done=false', async () => {
    spy = mockFetch([
      {
        url: OPERATIONS_URL,
        response: { done: false },
      },
    ])

    const result = await googleVeoAdapter.pollTask!('tok', 'projects/p/operations/op-456')
    expect(result.status).toBe('pending')
  })

  it('pollTask returns failed when error is set', async () => {
    spy = mockFetch([
      {
        url: OPERATIONS_URL,
        response: { done: true, error: { message: 'quota exceeded' } },
      },
    ])

    const result = await googleVeoAdapter.pollTask!('tok', 'projects/p/operations/op-err')
    expect(result.status).toBe('failed')
  })
})
