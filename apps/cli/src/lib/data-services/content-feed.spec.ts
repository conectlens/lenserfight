jest.mock('../../utils/api', () => ({
  callRpc: jest.fn(),
}))

import { callRpc } from '../../utils/api'
import { getPersonalContentFeed, isContentFeedType } from './content-feed'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

describe('content-feed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('isContentFeedType accepts threads, lenses, and prompts', () => {
    expect(isContentFeedType('threads')).toBe(true)
    expect(isContentFeedType('lenses')).toBe(true)
    expect(isContentFeedType('prompts')).toBe(true)
    expect(isContentFeedType('videos')).toBe(false)
  })

  it('getPersonalContentFeed calls fn_content_get_personal_threads without p_lenser_id', async () => {
    mockCallRpc.mockResolvedValue([
      { id: 't-1', title: 'Thread', personal_score: 0.5, primary_language: 'en' },
    ])

    const rows = await getPersonalContentFeed('threads', 10)

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_content_get_personal_threads',
      { p_limit: 10, p_offset: 0 },
      { requireAuth: true },
    )
    expect(rows[0].title).toBe('Thread')
  })

  it('getPersonalContentFeed maps prompts to fn_content_get_personal_lenses', async () => {
    mockCallRpc.mockResolvedValue([
      { id: 'l-1', title: 'Lens', personal_score: 0.8, primary_language: 'en' },
    ])

    await getPersonalContentFeed('prompts', 5)

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_content_get_personal_lenses',
      { p_limit: 5, p_offset: 0 },
      { requireAuth: true },
    )
  })
})
