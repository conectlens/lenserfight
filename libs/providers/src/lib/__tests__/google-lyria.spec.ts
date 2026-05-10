import { googleLyriaAdapter } from '../google-lyria'
import { mockFetch, resetFetchMock } from '../../../../../../../infra/execution/src/lib/testing'

const OPERATIONS_URL = /aiplatform\.googleapis\.com.*operations/
const PREDICT_URL = /aiplatform\.googleapis\.com.*predictLongRunning/

describe('googleLyriaAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate returns pending', async () => {
    spy = mockFetch([
      {
        url: PREDICT_URL,
        response: { name: 'projects/p/operations/lyria-op-1' },
      },
    ])

    const result = await googleLyriaAdapter.generate('tok', 'lyria-2', 'calm music', {
      project: 'p',
      region: 'us-central1',
    })
    expect(result.status).toBe('pending')
  })

  it('pollTask decodes base64 audioContent into data URI', async () => {
    const fakeB64 = Buffer.from('FAKE_MP3_BYTES').toString('base64')
    spy = mockFetch([
      {
        url: OPERATIONS_URL,
        response: { done: true, response: { audioContent: fakeB64 } },
      },
    ])

    const result = await googleLyriaAdapter.pollTask!('tok', 'projects/p/operations/lyria-op-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toMatch(/^data:audio\/mpeg;base64,/)
    }
  })
})
