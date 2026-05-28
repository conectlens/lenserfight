import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

export interface UseWizardStepOptions {
  /** Highest valid step index (inclusive). Defaults to Infinity (unbounded). */
  maxStep?: number
  /** Lowest valid step index (inclusive). Defaults to 0. */
  minStep?: number
}

export interface UseWizardStepReturn {
  step: number
  goToStep: (n: number) => void
  nextStep: () => void
  prevStep: () => void
  isFirstStep: boolean
  isLastStep: boolean
}

/**
 * URL-driven wizard step manager.
 *
 * Reads and writes `?step=N` from the URL search params.
 * Each `goToStep` call pushes a new history entry (`replace: false`),
 * so browser back/forward navigates between wizard steps naturally.
 *
 * Designed to be used inside a `ModalRoute` or any route-based modal:
 *
 * @example
 * // Inside CreateBattleWizard (rendered at /battles/create):
 * const { step, goToStep } = useWizardStep({ maxStep: 4 })
 * // /battles/create          → step 0
 * // /battles/create?step=2   → step 2
 * // browser back             → step 1, then step 0, then modal closes
 */
export const useWizardStep = (options: UseWizardStepOptions = {}): UseWizardStepReturn => {
  const { maxStep = Infinity, minStep = 0 } = options
  const [searchParams, setSearchParams] = useSearchParams()

  const raw = parseInt(searchParams.get('step') ?? String(minStep), 10)
  const step = Number.isNaN(raw) ? minStep : Math.min(Math.max(raw, minStep), maxStep === Infinity ? raw : maxStep)

  const goToStep = useCallback((n: number) => {
    const clamped = Math.min(
      Math.max(n, minStep),
      maxStep === Infinity ? n : maxStep
    )
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('step', String(clamped))
        return next
      },
      { replace: false }
    )
  }, [minStep, maxStep, setSearchParams])

  const nextStep = useCallback(() => goToStep(step + 1), [goToStep, step])
  const prevStep = useCallback(() => goToStep(step - 1), [goToStep, step])

  return {
    step,
    goToStep,
    nextStep,
    prevStep,
    isFirstStep: step <= minStep,
    isLastStep: maxStep !== Infinity && step >= maxStep,
  }
}
