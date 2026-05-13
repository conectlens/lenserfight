import { Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import React from 'react'
import { SegmentedProgressBar, XpBadge } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingStickyBannerProps {
  score: number
  earnedXp: number
  totalXp: number
  nextTask: OnboardingTask | null
  onDismiss: () => void
}

export function OnboardingStickyBanner({
  score, earnedXp, totalXp, nextTask, onDismiss,
}: OnboardingStickyBannerProps) {
  return (
    <div
      role="banner"
      aria-label="Onboarding progress"
      className="sticky top-0 z-30 w-full border-b border-primary-yellow-500/20 bg-primary-yellow-500/6 backdrop-blur-sm dark:bg-primary-yellow-500/4"
    >
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-2.5">
        <Sparkles size={15} className="flex-shrink-0 text-primary-yellow-600 dark:text-primary-yellow-500" aria-hidden />
        <div className="flex-1 min-w-0 space-y-1">
          <SegmentedProgressBar score={score} />
        </div>
        <span className="text-xs font-bold tabular-nums text-primary-yellow-700 dark:text-primary-yellow-400">
          {score}%
        </span>
        <XpBadge xp={earnedXp} total={totalXp} />
        {nextTask && (
          <Link
            to={nextTask.href}
            className="hidden sm:inline-flex items-center rounded-full bg-primary-yellow-500 px-3 py-1 text-xs font-semibold text-greyscale-900 hover:bg-primary-yellow-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-700"
          >
            {nextTask.label}
          </Link>
        )}
        <button
          onClick={onDismiss}
          aria-label="Dismiss banner"
          className="flex-shrink-0 rounded-full p-1 text-primary-yellow-600/60 hover:text-primary-yellow-700 hover:bg-primary-yellow-500/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
