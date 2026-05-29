jest.mock('../../utils/api', () => ({
  callRpc: jest.fn(),
}))

jest.mock('./lenser', () => ({
  getActiveLenserProfileId: jest.fn(),
}))

import { callRpc } from '../../utils/api'
import { getActiveLenserProfileId } from './lenser'
import { getHumanActivityFeed } from './agent-workspace'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>
const mockGetActiveLenserProfileId = getActiveLenserProfileId as jest.MockedFunction<
  typeof getActiveLenserProfileId
>

describe('getHumanActivityFeed', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns empty array when no active profile', async () => {
    mockGetActiveLenserProfileId.mockResolvedValue(null)

    await expect(getHumanActivityFeed(10)).resolves.toEqual([])
    expect(mockCallRpc).not.toHaveBeenCalled()
  })

  it('calls fn_get_human_activity_feed with profile id and limit', async () => {
    mockGetActiveLenserProfileId.mockResolvedValue('lenser-1')
    mockCallRpc.mockResolvedValue([])

    await getHumanActivityFeed(10, 5)

    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_get_human_activity_feed',
      { p_human_lenser_id: 'lenser-1', p_limit: 10, p_offset: 5 },
      { requireAuth: true },
    )
  })
})
