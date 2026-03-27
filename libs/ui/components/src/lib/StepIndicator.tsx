import { Check } from 'lucide-react'
import React, { useState } from 'react'

export interface StepIndicatorItem {
  label: string
}

interface StepIndicatorProps {
  steps: StepIndicatorItem[]
  currentStep: number
  /**
   * Per-step validity. When provided, clicking a step navigates only if all
   * prior steps are valid; otherwise the first invalid step shakes briefly.
   */
  stepValidity?: boolean[]
  /** Called with the target step index when navigation is allowed. */
  onStepClick?: (step: number) => void
}

/**
 * StepIndicator — pure presentational component (GRASP: Information Expert).
 * Owns only the knowledge of how to render step state; no navigation logic.
 */
export const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  stepValidity,
  onStepClick,
}) => {
  const isCompact = steps.length > 4
  // Index of step bubble that should shake (invalid block attempt)
  const [shakingStep, setShakingStep] = useState<number | null>(null)

  const handleStepClick = (index: number) => {
    if (!onStepClick || index === currentStep) return

    if (stepValidity) {
      // Find first invalid step that blocks reaching the target
      const blockingStep = stepValidity.slice(0, index).findIndex((valid) => !valid)
      if (blockingStep !== -1) {
        // Shake the blocking step's bubble to signal the user must fix it first
        setShakingStep(blockingStep)
        setTimeout(() => setShakingStep(null), 600)
        return
      }
    }

    onStepClick(index)
  }

  return (
    <div
      role="list"
      aria-label="Progress steps"
      className="flex w-full items-center justify-between gap-1"
    >
      {steps.map((step, index) => {
        const isDone = index < currentStep
        const isCurrent = index === currentStep
        const isInvalid = stepValidity ? !stepValidity[index] && index <= currentStep : false
        const isShaking = shakingStep === index
        const isClickable = !!onStepClick && index !== currentStep

        return (
          <React.Fragment key={index}>
            <div
              role="listitem"
              aria-current={isCurrent ? 'step' : undefined}
              className="flex items-center gap-2"
            >
              {/* Step bubble */}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => handleStepClick(index)}
                aria-label={`Go to step ${index + 1}: ${step.label}`}
                className={[
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-all duration-200',
                  isClickable ? 'cursor-pointer' : 'cursor-default',
                  isShaking ? 'animate-[shake_0.4s_ease-in-out]' : '',
                  isDone
                    ? 'bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                    : isCurrent
                      ? isInvalid
                        ? 'border-2 border-status-red text-status-red shadow-[0_0_0_3px_color-mix(in_srgb,var(--cl-status-red,#ef4444)_12%,transparent)]'
                        : 'border-2 border-[var(--cl-yellow-500)] text-[var(--cl-yellow-500)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--cl-yellow-500)_12%,transparent)]'
                      : isInvalid
                        ? 'border-2 border-status-red/60 text-status-red'
                        : 'border border-surface-border text-greyscale-400',
                ].join(' ')}
              >
                {isDone ? <Check size={13} strokeWidth={2.5} /> : index + 1}
              </button>

              {/* Step label */}
              <span
                className={[
                  'hidden text-[11px] font-semibold whitespace-nowrap sm:block transition-all duration-300',
                  isCompact && !isCurrent ? 'sm:hidden' : 'sm:block',
                  isCurrent
                    ? isInvalid
                      ? 'text-status-red'
                      : 'text-greyscale-900 dark:text-greyscale-50'
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
                  'h-px min-w-[8px] flex-1 transition-all duration-300',
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
