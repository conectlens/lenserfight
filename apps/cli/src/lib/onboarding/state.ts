import {
  getOnboardingState,
  saveOnboardingState,
  type OnboardingStateSnapshot,
} from '../../config/project-config'
import type { OnboardingStepId, SetupMode } from './schema'

export function loadOnboardingSnapshot(cwd = process.cwd()): OnboardingStateSnapshot | null {
  return getOnboardingState(cwd)
}

export function markOnboardingStarted(mode: SetupMode, cwd = process.cwd()): OnboardingStateSnapshot {
  return saveOnboardingState({
    status: 'in_progress',
    mode,
  }, cwd)
}

export function markOnboardingStep(
  stepId: OnboardingStepId,
  status: 'completed' | 'skipped',
  cwd = process.cwd(),
): OnboardingStateSnapshot {
  const current = getOnboardingState(cwd)
  const completedSteps = new Set(current?.completedSteps ?? [])
  const skippedSteps = new Set(current?.skippedSteps ?? [])
  if (status === 'completed') {
    completedSteps.add(stepId)
    skippedSteps.delete(stepId)
  } else {
    skippedSteps.add(stepId)
  }

  return saveOnboardingState({
    status: 'in_progress',
    completedSteps: Array.from(completedSteps),
    skippedSteps: Array.from(skippedSteps),
  }, cwd)
}

export function markOnboardingFailed(error: string, cwd = process.cwd()): OnboardingStateSnapshot {
  return saveOnboardingState({
    status: 'partial',
    lastError: error,
  }, cwd)
}

export function markOnboardingComplete(mode: SetupMode, cwd = process.cwd()): OnboardingStateSnapshot {
  return saveOnboardingState({
    status: 'complete',
    mode,
    lastError: undefined,
  }, cwd)
}
