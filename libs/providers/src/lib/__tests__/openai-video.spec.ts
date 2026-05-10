import { openaiVideoAdapter } from '../openai-video'
import { mockFetch, resetFetchMock } from '../testing'

describe('openaiVideoAdapter', () => {
  let spy: jest.SpyInstance

  afterEach(() => {
    if (spy) resetFetchMock(spy)
  })

  it('generate returns pending with providerTaskId', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/video\/generations$/,
        response: { id: 'task-abc', status: 'in_progress' },
      },
    ])

    const result = await openaiVideoAdapter.generate('sk-test', 'sora-1', 'a sunrise', {})
    expect(result.status).toBe('pending')
    if (result.status === 'pending') {
      expect(result.providerTaskId).toBe('task-abc')
    }
  })

  it('pollTask returns completed with URL when status=completed', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/video\/generations\/task-abc/,
        response: { id: 'task-abc', status: 'completed', data: [{ url: 'https://cdn.openai.com/v.mp4' }], duration: 5 },
      },
    ])

    const result = await openaiVideoAdapter.pollTask!('sk-test', 'task-abc')
    expect(result.status).toBe('completed')
    if (result.status === 'completed') {
      expect(result.urls[0]).toBe('https://cdn.openai.com/v.mp4')
    }
  })

  it('pollTask returns pending when status=in_progress', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/video\/generations\/task-pending/,
        response: { id: 'task-pending', status: 'in_progress' },
      },
    ])

    const result = await openaiVideoAdapter.pollTask!('sk-test', 'task-pending')
    expect(result.status).toBe('pending')
  })

  it('pollTask returns failed when status=failed', async () => {
    spy = mockFetch([
      {
        url: /api\.openai\.com\/v1\/video\/generations\/task-fail/,
        response: { id: 'task-fail', status: 'failed' },
      },
    ])

    const result = await openaiVideoAdapter.pollTask!('sk-test', 'task-fail')
    expect(result.status).toBe('failed')
  })
})
