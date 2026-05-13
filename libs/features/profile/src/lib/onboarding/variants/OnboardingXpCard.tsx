import { Sparkles, TrendingUp, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import React from 'react'
import { SegmentedProgressBar, TaskPill } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingXpCardProps {
  score: number
  earnedXp: number
  totalXp: number
  tasks: OnboardingTask[]
  nextTask: OnboardingTask | null
  onDismiss: () => void
}

function Tier({ score }: { score: number }) {
  if (score >= 90) return <span className="text-[10px] font-bold tracking-widest uppercase text-status-purple">Elite</span>
  if (score >= 70) return <span className="text-[10px] font-bold tracking-widest uppercase text-status-blue">Advanced</span>
  if (score >= 40) return <span className="text-[10px] font-bold tracking-widest uppercase text-primary-yellow-600">Rising</span>
  return <span className="text-[10px] font-bold tracking-widest uppercase text-greyscale-500">Starter</span>
}

export function OnboardingXpCard({
  score, earnedXp, totalXp, tasks, nextTask, onDismiss,
}: OnboardingXpCardProps) {
  const remaining = totalXp - earnedXp
  const pending = tasks.filter((t) => !t.completed).slice(0, 4)

  return (
    <div
      role="region"
      aria-label="XP progression"
      className="relative rounded-2xl border border-primary-yellow-500/30 bg-gradient-to-br from-primary-yellow-500/8 via-transparent to-transparent dark:from-primary-yellow-500/5 overflow-hidden"
    >
      {/* Subtle glow */}
      <div
        className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full bg-primary-yellow-500/15 blur-2xl"
        aria-hidden
      />

      <div className="relative p-4 space-y-3.5">
        {/* Header row */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-yellow-500/20">
              <Sparkles size={14} className="text-primary-yellow-600 dark:text-primary-yellow-500" aria-hidden />
            </div>
            <div>
              <Tier score={score} />
              <p className="text-xs font-semibold text-greyscale-900 dark:text-greyscale-50 leading-tight">
                XP Progress
              </p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className="rounded-full p-1 text-greyscale-400 hover:text-greyscale-600 hover:bg-greyscale-100 dark:hover:bg-greyscale-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
          >
            <X size={13} />
          </button>
        </div>

        {/* XP counter */}
        <div className="flex items-end gap-1.5">
          <span className="text-2xl font-black tabular-nums text-primary-yellow-600 dark:text-primary-yellow-400 leading-none">
            {earnedXp}
          </span>
          <span className="text-sm text-greyscale-400 mb-0.5 tabular-nums">/ {totalXp} XP</span>
          <div className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-status-green">
            <TrendingUp size={11} aria-hidden />
            {remaining > 0 ? `+${remaining} available` : 'Max reached'}
          </div>
        </div>

        <SegmentedProgressBar score={score} />

        {/* Pending tasks */}
        {pending.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-greyscale-400">
              Earn more XP
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pending.map((t) => (
                <Link key={t.id} to={t.href} tabIndex={-1}>
                  <TaskPill task={t} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {nextTask && (
          <Link
            to={nextTask.href}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary-yellow-500 px-4 py-2 text-xs font-bold text-greyscale-900 hover:bg-primary-yellow-400 active:bg-primary-yellow-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-700"
          >
            <Sparkles size={12} aria-hidden />
            {nextTask.label} — +{nextTask.xp} XP
          </Link>
        )}
      </div>
    </div>
  )
}
