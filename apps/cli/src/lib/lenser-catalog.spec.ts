jest.mock('consola', () => ({
  __esModule: true,
  default: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))
jest.mock('../utils/api', () => ({
  callRpc: jest.fn(),
}))

import { callRpc } from '../utils/api'
import { getAiLenserProfile } from './lenser-catalog'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('getAiLenserProfile visibility gate', () => {
  it('returns null when the agent is not visible to the caller (private/community)', async () => {
    mockCallRpc
      // fn_get_agent_profile — not owned
      .mockResolvedValueOnce(null as never)
      // fn_redacted_agent_snapshot — ungated, returns the agent regardless
      .mockResolvedValueOnce({
        agent_id: 'agent-1',
        profile_id: 'profile-1',
        handle: 'secret_bot',
        is_active: true,
      } as never)
      // fn_resolve_ai_lenser_ids_for_profiles — gated, agent is NOT visible
      .mockResolvedValueOnce([] as never)

    const result = await getAiLenserProfile('agent-1')

    expect(result).toBeNull()
    expect(mockCallRpc).toHaveBeenCalledWith(
      'fn_resolve_ai_lenser_ids_for_profiles',
      { p_profile_ids: ['profile-1'] },
      expect.objectContaining({ requireAuth: true }),
    )
  })

  it('returns the redacted profile when the agent is visible', async () => {
    mockCallRpc
      .mockResolvedValueOnce(null as never) // not owned
      .mockResolvedValueOnce({
        agent_id: 'agent-1',
        profile_id: 'profile-1',
        handle: 'gpt',
        display_name: 'GPT',
        is_active: true,
        runtime_pref: 'cloud',
      } as never)
      .mockResolvedValueOnce([
        { profile_id: 'profile-1', ai_lenser_id: 'agent-1' },
      ] as never)

    const result = await getAiLenserProfile('agent-1')

    expect(result).toMatchObject({ id: 'agent-1', handle: 'gpt', runtime_pref: 'cloud' })
  })

  it('returns the owned profile without consulting the public path', async () => {
    mockCallRpc.mockResolvedValueOnce({ id: 'agent-1', handle: 'mine' } as never)

    const result = await getAiLenserProfile('agent-1')

    expect(result).toMatchObject({ id: 'agent-1', handle: 'mine' })
    expect(mockCallRpc).toHaveBeenCalledTimes(1)
  })
})
