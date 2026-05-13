import { DialogHeaderContext, DialogFooterContext, ModalFooter } from '@lenserfight/ui/overlays'
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

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
  /** Optional action rendered right of the title+description block in the dialog header */
  action?: React.ReactNode
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

  // All callback props are held in a ref so callers passing inline arrows
  // (the common case) don't invalidate handlePrimaryAction → footerNode →
  // setFooter on every render and trigger a "Maximum update depth exceeded"
  // loop with the parent that hoists the footer slot via state.
  const callbacksRef = useRef({ onBack, onCancel, onNext, onComplete, skipButton })
  callbacksRef.current = { onBack, onCancel, onNext, onComplete, skipButton }

  const handlePrimaryAction = useCallback(() => {
    if (isPrimaryBlocked || !canProceed) return
    if (isLastStep) {
      callbacksRef.current.onComplete()
      return
    }
    callbacksRef.current.onNext()
  }, [isPrimaryBlocked, canProceed, isLastStep])

  // Push current step header into the parent Dialog's header slot (if inside one)
  const { setHeader, clearHeader } = useContext(DialogHeaderContext)
  useEffect(() => {
    setHeader({ title: current.title, description: current.description, icon: current.icon, action: current.action })
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

  // Build footer node and hoist it into Dialog's sticky footer slot.
  const { setFooter, clearFooter } = useContext(DialogFooterContext)

  const hasSkip = !!skipButton
  const skipLabel = skipButton?.label
  const hasCancel = !!onCancel

  const footerNode = useMemo(() => (
    <ModalFooter
      leftButton={{
        label: currentStep === 0 && hasCancel ? 'Cancel' : '← Back',
        onClick: () => {
          const { onBack: back, onCancel: cancel } = callbacksRef.current
          if (currentStep === 0 && cancel) cancel()
          else back()
        },
        disabled: !hasCancel && currentStep === 0,
        variant: 'ghost',
      }}
      rightButtons={
        hasSkip
          ? [{ label: skipLabel, onClick: () => callbacksRef.current.skipButton?.onClick(), variant: 'ghost' }]
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
  ), [currentStep, hasCancel, hasSkip, skipLabel, isLastStep, completeIcon, completeLabel,
      handlePrimaryAction, canProceed, isCompleting, nextLabel, isNextLoading])

  useEffect(() => {
    setFooter(footerNode)
  }, [footerNode, setFooter])

  useEffect(() => {
    return () => clearFooter()
  }, [clearFooter])

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
