import React from 'react'
import { Button } from './Button'

interface StepWizardProps {
  steps: string[]
  currentStep: number
  children: React.ReactNode
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  canProceed: boolean
  isNextLoading?: boolean
  isCompleting?: boolean
  nextLabel?: string
  completeLabel?: string
}

export const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep,
  children,
  onNext,
  onBack,
  onComplete,
  canProceed,
  isNextLoading = false,
  isCompleting = false,
  nextLabel = 'Next',
  completeLabel = 'Complete',
}) => {
  const isLastStep = currentStep === steps.length - 1

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2">
        {steps.map((label, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep
          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                    isDone
                      ? 'bg-primary text-white'
                      : isCurrent
                        ? 'ring-2 ring-primary text-primary bg-white dark:bg-gray-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-medium',
                    isCurrent ? 'text-primary' : 'text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={[
                    'h-px w-12 mb-5 transition-colors',
                    isDone ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700',
                  ].join(' ')}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step content */}
      <div>{children}</div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={currentStep === 0}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          ← Back
        </button>

        {isLastStep ? (
          <Button
            type="button"
            onClick={onComplete}
            disabled={!canProceed || isCompleting}
            isLoading={isCompleting}
            className="px-6"
          >
            {completeLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isNextLoading}
            isLoading={isNextLoading}
            className="px-6"
          >
            {nextLabel} →
          </Button>
        )}
      </div>
    </div>
  )
}
