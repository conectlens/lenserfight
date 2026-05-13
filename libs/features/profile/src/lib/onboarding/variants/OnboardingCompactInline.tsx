import { Link } from 'react-router-dom'
import React from 'react'
import { DismissButton, ScoreRing, SegmentedProgressBar, TaskPill, XpBadge } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingCompactInlineProps {
  score: number
  earnedXp: number
  totalXp: number
  tasks: OnboardingTask[]
  onDismiss: () => void
}

export function OnboardingCompactInline({
  score, earnedXp, totalXp, tasks, onDismiss,
}: OnboardingCompactInlineProps) {
  const pending = tasks.filter((t) => !t.completed).slice(0, 3)

  return (
    <div
      role="region"
      aria-label="Profile completion"
      className="rounded-2xl border border-greyscale-200 dark:border-greyscale-800 bg-greyscale-25 dark:bg-greyscale-900/60 px-4 py-3.5 space-y-3"
    >
      <div className="flex items-center gap-3">
        <ScoreRing score={score} size={44} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 leading-tight">
              Complete your profile
            </p>
            <XpBadge xp={earnedXp} total={totalXp} />
          </div>
          <SegmentedProgressBar score={score} />
        </div>
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 text-xs font-bold"
        >
          ✕
        </button>
      </div>

      {pending.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {pending.map((t) => (
            <Link key={t.id} to={t.href} tabIndex={-1}>
              <TaskPill task={t} />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
