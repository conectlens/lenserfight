import { Button } from '@lenserfight/ui/components'
import { DialogHeaderContext, DialogFooterContext, ModalFooter } from '@lenserfight/ui/overlays'
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react'

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
  steps: WizardStepConfig[] | string[]
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

  // Normalize steps to WizardStepConfig[]
  const normalizedSteps = useMemo<WizardStepConfig[]>(() => {
    return steps.map((s) => (typeof s === 'string' ? { label: s, title: s } : s))
  }, [steps])

  const currentConfig = normalizedSteps[currentStep]

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

  // Hoist header to Dialog context
  const { setHeader, clearHeader } = useContext(DialogHeaderContext)
  useEffect(() => {
    if (setHeader && currentConfig) {
      setHeader({
        title: currentConfig.title,
        description: currentConfig.description,
        icon: currentConfig.icon,
        action: currentConfig.action,
      })
    }
    return () => clearHeader?.()
  }, [currentConfig, setHeader, clearHeader])

  // Keyboard shortcut (Ctrl/Meta + Enter)
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

  // Hoist footer to Dialog context
  const { setFooter, clearFooter } = useContext(DialogFooterContext)
  const footerNode = useMemo(() => {
    const { onCancel: cancel, skipButton: skip } = callbacksRef.current
    return (
      <ModalFooter
        leftButton={{
          label: currentStep === 0 && cancel ? 'Cancel' : '← Back',
          onClick: () => {
            if (currentStep === 0 && callbacksRef.current.onCancel) callbacksRef.current.onCancel()
            else callbacksRef.current.onBack()
          },
          disabled: !cancel && currentStep === 0,
          variant: 'ghost',
        }}
        rightButtons={
          skip
            ? [{ label: skip.label, onClick: () => callbacksRef.current.skipButton?.onClick(), variant: 'ghost' }]
            : undefined
        }
        primaryButton={{
          label: isLastStep ? completeLabel : `${nextLabel} →`,
          onClick: handlePrimaryAction,
          disabled: !canProceed || (isLastStep ? isCompleting : isNextLoading),
          isLoading: isLastStep ? isCompleting : isNextLoading,
        }}
      />
    )
  }, [currentStep, isLastStep, completeLabel, nextLabel, handlePrimaryAction, canProceed, isCompleting, isNextLoading])

  useEffect(() => {
    if (setFooter) {
      setFooter(footerNode)
    }
    return () => clearFooter?.()
  }, [footerNode, setFooter, clearFooter])

  return (
    <div className="flex flex-col gap-6">
      {/* Step indicator */}
      <div className="relative flex items-center justify-between gap-1 w-full px-2">
        {normalizedSteps.map((step, index) => {
          const isDone = index < currentStep
          const isCurrent = index === currentStep
          const isCompact = normalizedSteps.length > 4

          return (
            <React.Fragment key={index}>
              <div className="flex items-center gap-2 shrink-0 group">
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-300 shrink-0',
                    isDone
                      ? 'bg-primary-yellow-500 text-black shadow-lg shadow-primary-yellow-500/20'
                      : isCurrent
                      ? 'ring-2 ring-primary-yellow-500 text-primary-yellow-500 bg-primary-yellow-500/5'
                      : 'bg-greyscale-100 dark:bg-greyscale-800 text-greyscale-400 dark:text-greyscale-500',
                  ].join(' ')}
                >
                  {isDone ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={[
                    'text-xs font-semibold whitespace-nowrap transition-all duration-300',
                    isCompact && !isCurrent ? 'hidden' : 'hidden md:block',
                    isCurrent ? 'text-greyscale-900 dark:text-greyscale-50' : 'text-greyscale-400 dark:text-greyscale-500',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {index < normalizedSteps.length - 1 && (
                <div
                  className={[
                    'h-[2px] min-w-[8px] flex-1 mx-2 rounded-full transition-all duration-500',
                    isDone ? 'bg-primary-yellow-500' : 'bg-greyscale-100 dark:bg-greyscale-800',
                  ].join(' ')}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>

      {/* Step content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {children}
      </div>

      {/* Navigation - only shown if NOT inside a Dialog (fallback) */}
      {!setFooter && (
        <div className="flex flex-col-reverse gap-3 border-t border-greyscale-100 pt-4 dark:border-greyscale-800 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={currentStep === 0}
            className="text-sm font-medium text-greyscale-500 dark:text-greyscale-400 hover:text-greyscale-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-left"
          >
            ← Back
          </button>

          <div className="flex items-center gap-3">
            {skipButton && (
              <Button
                type="button"
                variant="ghost"
                onClick={skipButton.onClick}
                className="px-4"
              >
                {skipButton.label}
              </Button>
            )}

            <Button
              type="button"
              onClick={handlePrimaryAction}
              disabled={!canProceed || (isLastStep ? isCompleting : isNextLoading)}
              isLoading={isLastStep ? isCompleting : isNextLoading}
              className="px-6 sm:min-w-[140px]"
            >
              {isLastStep ? completeLabel : `${nextLabel} →`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
