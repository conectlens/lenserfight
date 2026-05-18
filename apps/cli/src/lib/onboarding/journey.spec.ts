jest.mock('../../utils/api', () => ({
  callRpc: jest.fn(),
}))

import { callRpc } from '../../utils/api'
import {
  JOURNEY_STEPS,
  EMPTY_JOURNEY,
  fetchJourneyState,
  countCompleted,
  nextRequiredStep,
  type JourneyState,
} from './journey'

const mockCallRpc = callRpc as jest.MockedFunction<typeof callRpc>

beforeEach(() => {
  jest.clearAllMocks()
})

describe('countCompleted', () => {
  it('returns correct count for partial completion', () => {
    const state: JourneyState = {
      ...EMPTY_JOURNEY,
      lens_created: true,
      battle_created: true,
    }

    const { done, total } = countCompleted(state)

    expect(done).toBe(2)
    expect(total).toBe(JOURNEY_STEPS.length)
  })
})

describe('nextRequiredStep', () => {
  it('returns first incomplete required step', () => {
    const state: JourneyState = {
      ...EMPTY_JOURNEY,
      lens_created: true,
    }

    const next = nextRequiredStep(state)

    expect(next).not.toBeNull()
    expect(next!.required).toBe(true)
    expect(state[next!.id]).toBe(false)
  })

  it('returns null when all required steps are done', () => {
    const state: JourneyState = { ...EMPTY_JOURNEY }
    // Mark all required steps as done
    for (const step of JOURNEY_STEPS.filter((s) => s.required)) {
      state[step.id] = true
    }

    const next = nextRequiredStep(state)

    expect(next).toBeNull()
  })
})

describe('fetchJourneyState', () => {
  it('returns state on success', async () => {
    const mockState: JourneyState = { ...EMPTY_JOURNEY, lens_created: true }
    mockCallRpc.mockResolvedValue(mockState)

    const result = await fetchJourneyState()

    expect(result).toEqual(mockState)
    expect(mockCallRpc).toHaveBeenCalledWith('fn_journey_state_get', {}, { requireAuth: true })
  })

  it('returns null on error', async () => {
    mockCallRpc.mockRejectedValue(new Error('RPC not found'))

    const result = await fetchJourneyState()

    expect(result).toBeNull()
  })
})

describe('JOURNEY_STEPS', () => {
  it('all steps have required fields', () => {
    expect(JOURNEY_STEPS.length).toBeGreaterThanOrEqual(8)
    for (const step of JOURNEY_STEPS) {
      expect(step.id).toBeTruthy()
      expect(step.label).toBeTruthy()
      expect(typeof step.required).toBe('boolean')
      expect(step.command).toBeTruthy()
      expect(step.webPath).toBeTruthy()
    }
  })
})
