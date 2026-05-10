import { klingAdapter } from '../kling'
import { mockFetch, resetFetchMock } from '../testing'

describe('klingAdapter (t2v)', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate returns pending with task_id', async () => {
    spy = mockFetch([
      {
        url: /klingai\.com\/v1\/videos\/text2video$/,
        response: { code: 0, data: { task_id: 'kling-task-1' } },
      },
    ])

    const result = await klingAdapter.generate('jwt-token', 'kling-2.0', 'a dragon', {})
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toBe('kling-task-1')
    }
  })

  it('pollTask returns completed with durationSeconds extracted', async () => {
    spy = mockFetch([
      {
        url: /klingai\.com\/v1\/videos\/text2video\/kling-task-1/,
        response: {
          code: 0,
          data: {
            task_status: 'succeed',
            task_result: { videos: [{ url: 'https://kling.ai/v.mp4', duration: '5.0' }] },
          },
        },
      },
    ])

    const result = await klingAdapter.pollTask!('jwt-token', 'kling-task-1')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.durationSeconds).toBe(5)
      expect(result.urls[0]).toBe('https://kling.ai/v.mp4')
    }
  })
})
