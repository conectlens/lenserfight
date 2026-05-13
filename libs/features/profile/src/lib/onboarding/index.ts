export { ProfileCompletionCard } from './ProfileCompletionCard'
export type { ProfileCompletionCardProps } from './ProfileCompletionCard'

export { useOnboarding } from './useOnboarding'
export type { UseOnboardingInput } from './useOnboarding'

export { OnboardingCompactInline } from './variants/OnboardingCompactInline'
export { OnboardingChecklistPanel } from './variants/OnboardingChecklistPanel'
export { OnboardingFloatingAssistant } from './variants/OnboardingFloatingAssistant'
export { OnboardingXpCard } from './variants/OnboardingXpCard'
export { OnboardingEmptyState } from './variants/OnboardingEmptyState'
export { OnboardingBottomSheet } from './variants/OnboardingBottomSheet'
export { OnboardingStickyBanner } from './variants/OnboardingStickyBanner'

export {
  ONBOARDING_TASKS,
  computeOnboardingScore,
  computeEarnedXp,
  computeTotalXp,
  getNextSuggestedTask,
  groupTasksByCategory,
} from './onboardingTasks'

export type {
  OnboardingTask,
  OnboardingState,
  OnboardingVariant,
  OnboardingCategory,
  OnboardingTaskId,
} from './onboardingTypes'
