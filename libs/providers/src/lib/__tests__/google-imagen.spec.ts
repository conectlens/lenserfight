import { googleImagenAdapter } from '../google-imagen'
import { mockFetch, resetFetchMock } from '../../../../../../../infra/execution/src/lib/testing'

const VERTEX_URL = /aiplatform\.googleapis\.com.*:predict/

describe('googleImagenAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('returns completed with data URI on success', async () => {
    spy = mockFetch([
      {
        url: VERTEX_URL,
        response: {
          predictions: [{ bytesBase64Encoded: 'aGVsbG8=', mimeType: 'image/png' }],
        },
      },
    ])

    const result = await googleImagenAdapter.generate('tok', 'imagen-4', 'a dog', {
      project: 'my-proj',
      region: 'us-central1',
    })
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toMatch(/^data:image\/png;base64,/)
    }
  })

  it('throws on safety block (predictions empty)', async () => {
    spy = mockFetch([
      {
        url: VERTEX_URL,
        response: { predictions: [] },
      },
    ])

    await expect(
      googleImagenAdapter.generate('tok', 'imagen-4', 'bad', { project: 'p', region: 'us-central1' }),
    ).rejects.toThrow()
  })
})
