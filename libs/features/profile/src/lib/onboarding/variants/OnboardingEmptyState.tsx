import { ArrowRight, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import React from 'react'
import { TaskIcon } from '../OnboardingShared'
import type { OnboardingTask } from '../onboardingTypes'

interface OnboardingEmptyStateProps {
  title: string
  description: string
  nextTask: OnboardingTask | null
  suggestedTasks?: OnboardingTask[]
}

export function OnboardingEmptyState({
  title, description, nextTask, suggestedTasks = [],
}: OnboardingEmptyStateProps) {
  const shown = suggestedTasks.slice(0, 3)

  return (
    <div
      role="region"
      aria-label="Getting started"
      className="flex flex-col items-center text-center py-12 px-6 max-w-md mx-auto"
    >
      {/* Icon cluster */}
      <div className="relative mb-6 flex h-16 w-16 items-center justify-center">
        <div className="absolute inset-0 rounded-2xl bg-primary-yellow-500/10 dark:bg-primary-yellow-500/8" />
        <div className="absolute inset-0 rounded-2xl bg-primary-yellow-500/8 blur-lg" aria-hidden />
        <Zap size={28} className="relative text-primary-yellow-600 dark:text-primary-yellow-500" />
      </div>

      <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-50">
        {title}
      </h3>
      <p className="mt-1.5 text-sm text-greyscale-500 dark:text-greyscale-400 max-w-xs">
        {description}
      </p>

      {nextTask && (
        <Link
          to={nextTask.href}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary-yellow-500 px-5 py-2.5 text-sm font-bold text-greyscale-900 hover:bg-primary-yellow-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-700"
        >
          {nextTask.label}
          <ArrowRight size={14} />
        </Link>
      )}

      {shown.length > 0 && (
        <div className="mt-6 flex flex-col gap-2 w-full text-left">
          {shown.map((task) => (
            <Link
              key={task.id}
              to={task.href}
              className="group flex items-center gap-3 rounded-xl border border-greyscale-200 dark:border-greyscale-800 bg-greyscale-50 dark:bg-greyscale-900/60 px-3.5 py-2.5 text-sm text-greyscale-700 dark:text-greyscale-300 hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
            >
              <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-greyscale-100 dark:bg-greyscale-800 group-hover:bg-primary-yellow-500/15 transition-colors">
                <TaskIcon name={task.iconName} size={13} className="text-greyscale-500 group-hover:text-primary-yellow-600 transition-colors" />
              </span>
              <span className="flex-1 font-medium">{task.label}</span>
              <span className="text-[10px] font-bold text-primary-yellow-600/70">+{task.xp} XP</span>
              <ArrowRight size={13} className="text-greyscale-300 dark:text-greyscale-700 group-hover:text-primary-yellow-600 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
