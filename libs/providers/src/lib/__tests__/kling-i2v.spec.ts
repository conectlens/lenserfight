import { klingI2vAdapter } from '../kling-i2v'
import { mockFetch, resetFetchMock } from '../testing'

describe('klingI2vAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate calls i2v endpoint and returns pending', async () => {
    spy = mockFetch([
      {
        url: /klingai\.com\/v1\/videos\/image2video/,
        response: { code: 0, data: { task_id: 'i2v-task-1' } },
      },
    ])

    const result = await klingI2vAdapter.generate('jwt-token', 'kling-2.0', 'pan left', {
      image_url: 'https://example.com/frame.jpg',
    })
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toBe('i2v-task-1')
    }

    const [url] = spy.mock.calls[0] as [string]
    expect(url).toMatch(/image2video/)
  })

  it('throws when image_url is missing', async () => {
    await expect(
      klingI2vAdapter.generate('jwt-token', 'kling-2.0', 'test', {}),
    ).rejects.toMatchObject({ code: 'invalid_request' })
  })

  it('pollTask returns completed with video URL', async () => {
    spy = mockFetch([
      {
        url: /klingai\.com\/v1\/videos\/image2video\/i2v-task-1/,
        response: {
          data: {
            task_status: 'succeed',
            task_result: { videos: [{ url: 'https://kling.ai/i2v.mp4', duration: '5.0' }] },
          },
        },
      },
    ])

    const result = await klingI2vAdapter.pollTask!('jwt-token', 'i2v-task-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('https://kling.ai/i2v.mp4')
    }
  })
})
