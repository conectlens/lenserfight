import { DialogHeaderContext, DialogFooterContext, ModalFooter } from '@lenserfight/ui/overlays'
import React, { useCallback, useContext, useEffect, useMemo } from 'react'

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
  /** Optional skip button shown between Back and primary action (e.g. "Skip for now") */
  skipButton?: { label: string; onClick: () => void }
  /**
   * Per-step validity array. When provided, clicking a step bubble navigates to it
   * only if all prior steps are valid. If a step is invalid, its inputs are highlighted.
   */
  stepValidity?: boolean[]
  /** Called when user clicks a step bubble and navigation is allowed. */
  onStepClick?: (step: number) => void
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
  skipButton,
  stepValidity,
  onStepClick,
}) => {
  const isLastStep = currentStep === steps.length - 1
  const current = steps[currentStep]
  const isPrimaryBlocked = isLastStep ? isCompleting : isNextLoading
  const handlePrimaryAction = useCallback(() => {
    if (isPrimaryBlocked || !canProceed) return
    if (isLastStep) {
      onComplete()
      return
    }
    onNext()
  }, [isPrimaryBlocked, canProceed, isLastStep, onComplete, onNext])

  // Push current step header into the parent Dialog's header slot (if inside one)
  const { setHeader, clearHeader } = useContext(DialogHeaderContext)
  useEffect(() => {
    setHeader({ title: current.title, description: current.description, icon: current.icon })
    return () => clearHeader()
  }, [current.title, current.description, current.icon, setHeader, clearHeader])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter') return
      if (isPrimaryBlocked || !canProceed) return
      e.preventDefault()
      handlePrimaryAction()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [canProceed, handlePrimaryAction, isPrimaryBlocked])

  // Build footer node and hoist it into Dialog's sticky footer slot
  const { setFooter, clearFooter } = useContext(DialogFooterContext)
  const footerNode = useMemo(() => (
    <ModalFooter
      leftButton={{
        label: currentStep === 0 && onCancel ? 'Cancel' : '← Back',
        onClick: currentStep === 0 && onCancel ? onCancel : onBack,
        disabled: !onCancel && currentStep === 0,
        variant: 'ghost',
      }}
      rightButtons={
        skipButton
          ? [{ label: skipButton.label, onClick: skipButton.onClick, variant: 'ghost' }]
          : undefined
      }
      primaryButton={
        isLastStep
          ? {
              label: <>{completeIcon}{completeLabel}</>,
              onClick: handlePrimaryAction,
              disabled: !canProceed || isCompleting,
              isLoading: isCompleting,
              className: 'px-6 sm:min-w-[140px]',
            }
          : {
              label: `${nextLabel} →`,
              onClick: handlePrimaryAction,
              disabled: !canProceed || isNextLoading,
              isLoading: isNextLoading,
              className: 'px-6 sm:min-w-[140px]',
            }
      }
    />
  ), [currentStep, onCancel, onBack, skipButton, isLastStep, completeIcon, completeLabel,
      handlePrimaryAction, canProceed, isCompleting, nextLabel, isNextLoading])

  useEffect(() => {
    setFooter(footerNode)
    return () => clearFooter()
  }, [footerNode, setFooter, clearFooter])

  return (
    <div className="flex flex-col">
      {/* Step indicator — separated section */}
      <div className="pb-5">
        <StepIndicator
          steps={steps}
          currentStep={currentStep}
          stepValidity={stepValidity}
          onStepClick={onStepClick}
        />
      </div>

      <div className="border-t border-surface-border" />

      {/* Step content */}
      <div className="py-5">{children}</div>
    </div>
  )
}
