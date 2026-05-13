import { Bot, ChevronRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import React, { useState } from 'react'
import { ScoreRing, SegmentedProgressBar, XpBadge } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingFloatingAssistantProps {
  score: number
  earnedXp: number
  totalXp: number
  tasks: OnboardingTask[]
  nextTask: OnboardingTask | null
  onDismiss: () => void
}

export function OnboardingFloatingAssistant({
  score, earnedXp, totalXp, tasks, nextTask, onDismiss,
}: OnboardingFloatingAssistantProps) {
  const [expanded, setExpanded] = useState(false)
  const remaining = tasks.filter((t) => !t.completed)

  return (
    <div
      role="complementary"
      aria-label="Onboarding assistant"
      className={[
        'fixed bottom-6 right-5 z-40 w-72 rounded-2xl border border-greyscale-200 dark:border-greyscale-800',
        'bg-white dark:bg-greyscale-900 shadow-xl shadow-greyscale-900/10 dark:shadow-black/40',
        'transition-all duration-300',
      ].join(' ')}
    >
      {/* Header */}
      <div
        className="flex cursor-pointer items-center gap-3 p-3.5 select-none"
        onClick={() => setExpanded((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-primary-yellow-500/15 flex items-center justify-center">
            <Bot size={16} className="text-primary-yellow-600 dark:text-primary-yellow-500" />
          </div>
          <span
            className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-status-green border-2 border-white dark:border-greyscale-900"
            aria-hidden
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50 leading-tight">
            {score >= 80 ? "Almost there!" : "Build your profile"}
          </p>
          <p className="text-[10px] text-greyscale-500 mt-0.5">
            {remaining.length} action{remaining.length !== 1 ? 's' : ''} left
          </p>
        </div>
        <ScoreRing score={score} size={36} />
        <button
          onClick={(e) => { e.stopPropagation(); onDismiss() }}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-full p-1 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary-yellow-500"
        >
          <X size={12} />
        </button>
      </div>

      {/* Progress strip */}
      <div className="px-3.5 pb-2">
        <SegmentedProgressBar score={score} />
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-greyscale-100 dark:border-greyscale-800 px-3.5 py-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-greyscale-400">Next steps</span>
            <XpBadge xp={earnedXp} total={totalXp} />
          </div>
          <ul className="space-y-1" role="list">
            {remaining.slice(0, 4).map((task) => (
              <li key={task.id}>
                <Link
                  to={task.href}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-greyscale-700 dark:text-greyscale-300 hover:bg-primary-yellow-500/8 hover:text-greyscale-900 dark:hover:text-greyscale-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-yellow-500 flex-shrink-0" aria-hidden />
                  <span className="flex-1 font-medium">{task.label}</span>
                  <span className="text-[10px] font-bold text-primary-yellow-600/70">+{task.xp}</span>
                  <ChevronRight size={10} className="text-greyscale-400 group-hover:text-greyscale-600 transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
          {nextTask && (
            <Link
              to={nextTask.href}
              className="mt-1 flex w-full items-center justify-center rounded-xl bg-primary-yellow-500 px-3 py-2 text-xs font-semibold text-greyscale-900 hover:bg-primary-yellow-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-700"
            >
              Start: {nextTask.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
