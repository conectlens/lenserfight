import { Button } from '@lenserfight/ui/components'
import React from 'react'


interface StepWizardProps {
  steps: string[]
  currentStep: number
  children: React.ReactNode
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  onCancel?: () => void
  canProceed: boolean
  isNextLoading?: boolean
  isCompleting?: boolean
  nextLabel?: string
  completeLabel?: string
  skipButton?: { label: string; onClick: () => void }
}

export const StepWizard: React.FC<StepWizardProps> = ({
  steps,
  currentStep,
  children,
  onNext,
  onBack,
  onComplete,
  onCancel,
  canProceed,
  isNextLoading = false,
  isCompleting = false,
  nextLabel = 'Next',
  completeLabel = 'Complete',
  skipButton,
}) => {
  const isLastStep = currentStep === steps.length - 1
  const isPrimaryBlocked = isLastStep ? isCompleting : isNextLoading
  const handlePrimaryAction = React.useCallback(() => {
    if (isPrimaryBlocked || !canProceed) return
    if (isLastStep) {
      onComplete()
      return
    }
    onNext()
  }, [canProceed, isLastStep, isPrimaryBlocked, onComplete, onNext])

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return
      if (isPrimaryBlocked || !canProceed) return
      e.preventDefault()
      handlePrimaryAction()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canProceed, handlePrimaryAction, isPrimaryBlocked])

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="relative flex items-center justify-between gap-1 w-full px-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="absolute -right-2 -top-4 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {steps.map((label, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep
          const isCompact = steps.length > 4

          return (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2 shrink-0">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors shrink-0',
                    isDone
                      ? 'bg-primary text-white'
                      : isCurrent
                        ? 'ring-2 ring-primary text-primary bg-white dark:bg-gray-800'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'text-[11px] font-medium whitespace-nowrap transition-all duration-300',
                    isCompact && !isCurrent ? 'hidden' : 'hidden sm:block',
                    isCurrent ? 'text-primary' : 'text-gray-400 dark:text-gray-500',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={[
                    'h-px min-w-[8px] flex-1 transition-colors',
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
      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          disabled={currentStep === 0}
          className="text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left"
        >
          ← Back
        </button>

        {skipButton && (
          <Button
            type="button"
            variant="ghost"
            onClick={skipButton.onClick}
            className="px-4 sm:w-auto"
          >
            {skipButton.label}
          </Button>
        )}

        {isLastStep ? (
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!canProceed || isCompleting}
            isLoading={isCompleting}
            className="px-6 sm:w-auto sm:min-w-[140px]"
          >
            {completeLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handlePrimaryAction}
            disabled={!canProceed || isNextLoading}
            isLoading={isNextLoading}
            className="px-6 sm:w-auto sm:min-w-[140px]"
          >
            {nextLabel} →
          </Button>
        )}
      </div>
    </div>
  )
}
