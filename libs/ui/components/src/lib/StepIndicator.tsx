import { Check } from 'lucide-react'
import React from 'react'

export interface StepIndicatorItem {
  label: string
}

interface StepIndicatorProps {
  steps: StepIndicatorItem[]
  currentStep: number
}

/**
 * StepIndicator — pure presentational component (GRASP: Information Expert).
 * Owns only the knowledge of how to render step state; no navigation logic.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div
      role="list"
      aria-label="Progress steps"
      className="flex items-center gap-3"
    >
      {steps.map((step, index) => {
        const isDone = index < currentStep
        const isActive = index === currentStep

        return (
          <React.Fragment key={index}>
            <div
              role="listitem"
              aria-current={isActive ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              {/* Step bubble */}
              <div
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200',
                  isDone
                    ? 'bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : isActive
                      ? 'border-2 border-[var(--cl-yellow-500)] text-[var(--cl-yellow-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cl-yellow-500)_12%,transparent)]'
                      : 'border border-surface-border text-greyscale-400',
                ].join(' ')}
              >
                {isDone ? <Check size={13} strokeWidth={2.5} /> : index + 1}
              </div>

              {/* Step label */}
              <span
                className={[
                  'hidden text-sm font-semibold sm:block transition-colors duration-200',
                  isActive
                    ? 'text-greyscale-900 dark:text-greyscale-50'
                    : isDone
                      ? 'text-greyscale-500 dark:text-greyscale-400'
                      : 'text-greyscale-400',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div
                className={[
                  'h-px flex-1 transition-all duration-300',
                  isDone
                    ? 'bg-greyscale-900 dark:bg-greyscale-0'
                    : 'bg-surface-border',
                ].join(' ')}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
