import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import React, { useState } from 'react'
import { CategoryLabel, DismissButton, ScoreRing, TaskIcon, XpBadge } from '../OnboardingShared'
import { groupTasksByCategory } from '../onboardingTasks'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingChecklistPanelProps {
  score: number
  earnedXp: number
  totalXp: number
  tasks: OnboardingTask[]
  onDismiss: () => void
}

function CategoryGroup({
  category,
  tasks,
}: {
  category: string
  tasks: OnboardingTask[]
}) {
  const [open, setOpen] = useState(true)
  const completed = tasks.filter((t) => t.completed).length
  const total = tasks.length
  const allDone = completed === total

  return (
    <div className="border border-greyscale-100 dark:border-greyscale-800 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-2 px-3.5 py-2.5 bg-greyscale-50/50 dark:bg-greyscale-800/30 hover:bg-greyscale-100/60 dark:hover:bg-greyscale-800/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-yellow-500"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <CategoryLabel id={category} />
        <span className="ml-auto text-[10px] font-semibold tabular-nums text-greyscale-400">
          {completed}/{total}
        </span>
        {allDone
          ? <Check size={13} className="text-status-green flex-shrink-0" />
          : open
            ? <ChevronDown size={13} className="text-greyscale-400 flex-shrink-0" />
            : <ChevronRight size={13} className="text-greyscale-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <ul className="divide-y divide-greyscale-100 dark:divide-greyscale-800/60" role="list">
          {tasks.map((task) => (
            <li key={task.id}>
              <Link
                to={task.href}
                aria-label={task.completed ? `${task.label} — complete` : task.label}
                className={[
                  'group flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-yellow-500',
                  task.completed
                    ? 'text-greyscale-400 dark:text-greyscale-600 pointer-events-none'
                    : 'text-greyscale-700 dark:text-greyscale-300 hover:bg-primary-yellow-500/5 hover:text-greyscale-900 dark:hover:text-greyscale-50',
                ].join(' ')}
                tabIndex={task.completed ? -1 : 0}
              >
                <span
                  className={[
                    'flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                    task.completed
                      ? 'border-greyscale-300 bg-greyscale-100 dark:border-greyscale-700 dark:bg-greyscale-800'
                      : 'border-primary-yellow-500/50 bg-primary-yellow-500/8 group-hover:bg-primary-yellow-500/15',
                  ].join(' ')}
                  aria-hidden
                >
                  {task.completed
                    ? <Check size={11} className="text-greyscale-400 dark:text-greyscale-600" />
                    : <TaskIcon name={task.iconName} size={10} className="text-primary-yellow-600 dark:text-primary-yellow-500" />
                  }
                </span>
                <span className="flex-1 font-medium leading-tight">{task.label}</span>
                {!task.completed && (
                  <span className="text-[10px] font-bold text-primary-yellow-600/70 tabular-nums">
                    +{task.xp} XP
                  </span>
                )}
                {!task.completed && (
                  <ChevronRight size={12} className="text-greyscale-300 dark:text-greyscale-600 group-hover:text-greyscale-500 transition-colors flex-shrink-0" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function OnboardingChecklistPanel({
  score, earnedXp, totalXp, tasks, onDismiss,
}: OnboardingChecklistPanelProps) {
  const groups = groupTasksByCategory(tasks)

  return (
    <div
      role="region"
      aria-label="Onboarding checklist"
      className="rounded-2xl border border-greyscale-200 dark:border-greyscale-800 bg-white dark:bg-greyscale-900/80 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-greyscale-100 dark:border-greyscale-800 px-4 py-3.5">
        <ScoreRing score={score} size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
            Profile strength
          </p>
          <p className="mt-0.5 text-xs text-greyscale-500">
            Complete steps to unlock XP bonuses and appear in discovery.
          </p>
        </div>
        <XpBadge xp={earnedXp} total={totalXp} />
      </div>

      {/* Category groups */}
      <div className="p-3 space-y-2">
        {Array.from(groups.entries()).map(([cat, catTasks]) => (
          <CategoryGroup key={cat} category={cat} tasks={catTasks} />
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end border-t border-greyscale-100 dark:border-greyscale-800 px-4 py-2.5">
        <DismissButton onDismiss={onDismiss} />
      </div>
    </div>
  )
}
