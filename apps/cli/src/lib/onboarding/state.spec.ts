jest.mock('../../config/project-config', () => ({
  getOnboardingState: jest.fn(),
  saveOnboardingState: jest.fn((state: unknown) => state),
}))

import { getOnboardingState, saveOnboardingState } from '../../config/project-config'
import {
  loadOnboardingSnapshot,
  markOnboardingStarted,
  markOnboardingStep,
  markOnboardingComplete,
  markOnboardingFailed,
} from './state'

const mockGetOnboardingState = getOnboardingState as jest.MockedFunction<typeof getOnboardingState>
const mockSaveOnboardingState = saveOnboardingState as jest.MockedFunction<typeof saveOnboardingState>

beforeEach(() => {
  jest.clearAllMocks()
  mockGetOnboardingState.mockReturnValue(null)
})

describe('state', () => {
  it('markOnboardingStarted saves in_progress status', () => {
    markOnboardingStarted('local')

    expect(mockSaveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'in_progress', mode: 'local' }),
      expect.any(String),
    )
  })

  it('markOnboardingStep completed adds to completedSteps', () => {
    mockGetOnboardingState.mockReturnValue({
      status: 'in_progress',
      completedSteps: ['detect_prerequisites'],
      skippedSteps: [],
    } as ReturnType<typeof getOnboardingState>)

    markOnboardingStep('verify_workspace', 'completed')

    expect(mockSaveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({
        completedSteps: expect.arrayContaining(['detect_prerequisites', 'verify_workspace']),
      }),
      expect.any(String),
    )
  })

  it('markOnboardingStep skipped adds to skippedSteps', () => {
    mockGetOnboardingState.mockReturnValue({
      status: 'in_progress',
      completedSteps: [],
      skippedSteps: [],
    } as ReturnType<typeof getOnboardingState>)

    markOnboardingStep('detect_prerequisites', 'skipped')

    const call = mockSaveOnboardingState.mock.calls[0][0] as Record<string, unknown>
    expect(call.skippedSteps).toContain('detect_prerequisites')
  })

  it('markOnboardingComplete saves complete status', () => {
    markOnboardingComplete('cloud')

    expect(mockSaveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'complete', mode: 'cloud' }),
      expect.any(String),
    )
  })

  it('markOnboardingFailed saves partial status with error', () => {
    markOnboardingFailed('something broke')

    expect(mockSaveOnboardingState).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'partial', lastError: 'something broke' }),
      expect.any(String),
    )
  })

  it('loadOnboardingSnapshot returns null when no state exists', () => {
    mockGetOnboardingState.mockReturnValue(null)

    const result = loadOnboardingSnapshot()

    expect(result).toBeNull()
  })
})
