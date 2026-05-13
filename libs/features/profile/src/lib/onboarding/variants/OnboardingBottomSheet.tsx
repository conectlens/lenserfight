import { ArrowRight, Check, ChevronDown, Sparkles, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import React, { useEffect, useRef, useState } from 'react'
import { DismissButton, ScoreRing, SegmentedProgressBar, TaskIcon, XpBadge } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingBottomSheetProps {
  score: number
  earnedXp: number
  totalXp: number
  tasks: OnboardingTask[]
  nextTask: OnboardingTask | null
  onDismiss: () => void
}

export function OnboardingBottomSheet({
  score, earnedXp, totalXp, tasks, nextTask, onDismiss,
}: OnboardingBottomSheetProps) {
  const [open, setOpen] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const pending = tasks.filter((t) => !t.completed)

  // trap focus when open
  useEffect(() => {
    if (!open) return
    const first = sheetRef.current?.querySelector<HTMLElement>('button, a, [tabindex]')
    first?.focus()
  }, [open])

  return (
    <>
      {/* Collapsed pill */}
      {!open && (
        <div className="fixed bottom-4 left-0 right-0 z-40 flex justify-center pointer-events-none">
          <button
            onClick={() => setOpen(true)}
            aria-label={`Open onboarding — ${score}% complete`}
            className="pointer-events-auto flex items-center gap-2.5 rounded-full border border-primary-yellow-500/40 bg-white dark:bg-greyscale-900 px-4 py-2 shadow-lg shadow-greyscale-900/15 text-sm font-semibold text-greyscale-900 dark:text-greyscale-50 hover:bg-primary-yellow-500/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
          >
            <Sparkles size={14} className="text-primary-yellow-600" aria-hidden />
            Complete profile
            <span className="tabular-nums text-primary-yellow-600 font-bold">{score}%</span>
            <ChevronDown size={14} className="text-greyscale-400 rotate-180" aria-hidden />
          </button>
        </div>
      )}

      {/* Sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-greyscale-900/40 dark:bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />

          {/* Panel */}
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label="Profile completion"
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-greyscale-200 dark:border-greyscale-800 bg-white dark:bg-greyscale-900 pb-safe pt-0"
            style={{ maxHeight: '80vh', overflowY: 'auto' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-greyscale-200 dark:bg-greyscale-700" aria-hidden />
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-greyscale-100 dark:border-greyscale-800">
              <ScoreRing score={score} size={44} />
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-50">
                    Build your profile
                  </p>
                  <XpBadge xp={earnedXp} total={totalXp} />
                </div>
                <SegmentedProgressBar score={score} />
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="flex-shrink-0 rounded-full p-1.5 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
              >
                <X size={15} />
              </button>
            </div>

            {/* Task list */}
            <ul className="divide-y divide-greyscale-100 dark:divide-greyscale-800 px-2 py-1" role="list">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    to={task.href}
                    onClick={() => setOpen(false)}
                    aria-label={task.completed ? `${task.label} — done` : task.label}
                    className={[
                      'flex items-center gap-3.5 rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500',
                      task.completed
                        ? 'text-greyscale-400 dark:text-greyscale-600 pointer-events-none'
                        : 'text-greyscale-800 dark:text-greyscale-200 hover:bg-primary-yellow-500/5 active:bg-primary-yellow-500/10',
                    ].join(' ')}
                    tabIndex={task.completed ? -1 : 0}
                  >
                    <span
                      className={[
                        'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center transition-colors',
                        task.completed
                          ? 'border-greyscale-200 dark:border-greyscale-700 bg-greyscale-100 dark:bg-greyscale-800'
                          : 'border-primary-yellow-500/40 bg-primary-yellow-500/10',
                      ].join(' ')}
                      aria-hidden
                    >
                      {task.completed
                        ? <Check size={14} className="text-greyscale-400" />
                        : <TaskIcon name={task.iconName} size={14} className="text-primary-yellow-600 dark:text-primary-yellow-500" />
                      }
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold leading-tight">{task.label}</p>
                      <p className="text-[11px] text-greyscale-500 mt-0.5">{task.description}</p>
                    </div>
                    {!task.completed && (
                      <span className="text-xs font-bold text-primary-yellow-600 tabular-nums">
                        +{task.xp}
                      </span>
                    )}
                    {!task.completed && (
                      <ArrowRight size={14} className="text-greyscale-300 dark:text-greyscale-700 flex-shrink-0" aria-hidden />
                    )}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-greyscale-100 dark:border-greyscale-800 bg-white dark:bg-greyscale-900 px-5 py-3">
              <DismissButton onDismiss={() => { setOpen(false); onDismiss() }} label="Remind me later" />
              {nextTask && (
                <Link
                  to={nextTask.href}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary-yellow-500 px-4 py-2 text-xs font-bold text-greyscale-900 hover:bg-primary-yellow-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-700"
                >
                  {nextTask.label}
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
