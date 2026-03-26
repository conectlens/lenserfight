import { Check } from 'lucide-react'
import React, { useEffect, useContext } from 'react'
import { DialogHeaderContext } from '@lenserfight/ui/overlays'

import { Button } from './Button'

export interface WizardStepConfig {
  /** Short label shown inside the step indicator rail */
  label: string
  /** Heading rendered above the step's children */
  title: string
  /** Optional subheading rendered below the title */
  description?: string
  /** Optional icon displayed beside the title */
  icon?: React.ReactNode
}

interface StepWizardProps {
  steps: WizardStepConfig[]
  currentStep: number
  children: React.ReactNode
  onNext: () => void
  onBack: () => void
  onComplete: () => void
  /** Called when Cancel is pressed on step 0 */
  onCancel?: () => void
  canProceed: boolean
  isNextLoading?: boolean
  isCompleting?: boolean
  nextLabel?: string
  completeLabel?: string
  /** Optional icon prepended to the complete button label */
  completeIcon?: React.ReactNode
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
  completeIcon,
}) => {
  const isLastStep = currentStep === steps.length - 1
  const current = steps[currentStep]

  // Push current step header into the parent Dialog's header slot (if inside one)
  const { setHeader, clearHeader } = useContext(DialogHeaderContext)
  useEffect(() => {
    setHeader({ title: current.title, description: current.description, icon: current.icon })
    return () => clearHeader()
  }, [current.title, current.description, current.icon, setHeader, clearHeader])

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator rail */}
      <div className="flex items-center gap-3">
        {steps.map((step, index) => {
          const isDone = index < currentStep
          const isActive = index === currentStep
          return (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2">
                <div
                  className={[
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                    isDone
                      ? 'bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900'
                      : isActive
                        ? 'border-2 border-status-blue text-status-blue'
                        : 'border border-surface-border text-greyscale-400',
                  ].join(' ')}
                >
                  {isDone ? <Check size={13} /> : index + 1}
                </div>
                <span
                  className={[
                    'hidden text-sm font-semibold sm:block',
                    isActive
                      ? 'text-greyscale-900 dark:text-greyscale-50'
                      : 'text-greyscale-400',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={[
                    'h-px flex-1 transition-colors',
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

      {/* Step content */}
      <div>{children}</div>

      {/* Navigation footer */}
      <div className="flex flex-col-reverse gap-3 border-t border-surface-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {currentStep === 0 && onCancel ? (
            <Button type="button" variant="ghost" onClick={onCancel} className="w-auto">
              Cancel
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={currentStep === 0}
              className="w-auto"
            >
              ← Back
            </Button>
          )}
        </div>

        {isLastStep ? (
          <Button
            type="button"
            onClick={onComplete}
            disabled={!canProceed || isCompleting}
            isLoading={isCompleting}
            className="inline-flex items-center gap-2 px-6 sm:w-auto sm:min-w-[140px]"
          >
            {completeIcon}
            {completeLabel}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceed || isNextLoading}
            isLoading={isNextLoading}
            className="inline-flex items-center gap-2 px-6 sm:w-auto sm:min-w-[140px]"
          >
            {nextLabel} →
          </Button>
        )}
      </div>
    </div>
  )
}
