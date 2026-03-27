import React, { useEffect, useContext } from 'react'
import { DialogHeaderContext, ModalFooter } from '@lenserfight/ui/overlays'

import { StepIndicator } from './StepIndicator'

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
    <div className="flex flex-col">
      {/* Step indicator — separated section */}
      <div className="pb-5">
        <StepIndicator steps={steps} currentStep={currentStep} />
      </div>

      <div className="border-t border-surface-border" />

      {/* Step content */}
      <div className="py-5">{children}</div>

      {/* Navigation footer */}
      <ModalFooter
        leftButton={{
          label: currentStep === 0 && onCancel ? 'Cancel' : '← Back',
          onClick: currentStep === 0 && onCancel ? onCancel : onBack,
          disabled: !onCancel && currentStep === 0,
          variant: 'ghost',
        }}
        primaryButton={
          isLastStep
            ? {
                label: <>{completeIcon}{completeLabel}</>,
                onClick: onComplete,
                disabled: !canProceed || isCompleting,
                isLoading: isCompleting,
                className: 'px-6 sm:min-w-[140px]',
              }
            : {
                label: `${nextLabel} →`,
                onClick: onNext,
                disabled: !canProceed || isNextLoading,
                isLoading: isNextLoading,
                className: 'px-6 sm:min-w-[140px]',
              }
        }
      />
    </div>
  )
}
