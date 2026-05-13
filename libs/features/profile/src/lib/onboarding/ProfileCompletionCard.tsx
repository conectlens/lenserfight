import React from 'react'
import type { OnboardingVariant } from './onboardingTypes'
import { useOnboarding, type UseOnboardingInput } from './useOnboarding'
import { OnboardingChecklistPanel } from './variants/OnboardingChecklistPanel'
import { OnboardingCompactInline } from './variants/OnboardingCompactInline'
import { OnboardingXpCard } from './variants/OnboardingXpCard'

export interface ProfileCompletionCardProps extends UseOnboardingInput {
  variant?: Extract<OnboardingVariant, 'compact-inline' | 'checklist-panel' | 'xp-card'>
  /** Hide once score reaches this threshold (default 100) */
  hideAbove?: number
}

/**
 * Drop-in replacement for ProfileCompletionBanner.
 *
 * Variant defaults to 'compact-inline', matching the old banner placement.
 * Use 'checklist-panel' in sidebars and settings views.
 * Use 'xp-card' in dashboard / discovery surfaces.
 */
export function ProfileCompletionCard({
  variant = 'compact-inline',
  hideAbove = 100,
  ...input
}: ProfileCompletionCardProps) {
  const { state, tasks, score, earnedXp, totalXp, nextTask, shouldShow, dismiss } = useOnboarding(input)

  if (!shouldShow || score >= hideAbove) return null

  if (variant === 'checklist-panel') {
    return (
      <OnboardingChecklistPanel
        score={score}
        earnedXp={earnedXp}
        totalXp={totalXp}
        tasks={tasks}
        onDismiss={dismiss}
      />
    )
  }

  if (variant === 'xp-card') {
    return (
      <OnboardingXpCard
        score={score}
        earnedXp={earnedXp}
        totalXp={totalXp}
        tasks={tasks}
        nextTask={nextTask}
        onDismiss={dismiss}
      />
    )
  }

  return (
    <OnboardingCompactInline
      score={score}
      earnedXp={earnedXp}
      totalXp={totalXp}
      tasks={tasks}
      onDismiss={dismiss}
    />
  )
}
