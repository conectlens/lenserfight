import { useAICreationGeneration } from '@lenserfight/infra/ai-creation'
import { useChainabitConnection } from '@lenserfight/features/store'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { Alert, Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { Popover, type PopoverPlacement } from '@lenserfight/ui/overlays'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import React, { useCallback, useEffect, useId, useRef, useState } from 'react'

import { useFundingSource } from '../hooks/useFundingSource'

import { friendlyAIError } from './aiCreationError'
import { FundingSourceToggle } from './FundingSourceToggle'

import type {
  AICreationOutput,
  BattleCreationContext,
  GenerationType,
  LensCreationContext,
  WorkflowCreationContext,
} from '@lenserfight/infra/ai-creation'

export interface GenerateWithAIButtonProps {
  /** auth.uid() of the active lenser — required to generate. */
  profileId: string
  /** Which AI sublayer to invoke. */
  generationType: GenerationType
  /** Type-specific context forwarded to the prompt builders. */
  context: LensCreationContext | WorkflowCreationContext | BattleCreationContext
  /** Fired with the parsed, typed result. Callers narrow on `output.type`. */
  onGenerated: (output: AICreationOutput) => void
  /** Tooltip + popover heading. Default 'Generate with AI'. */
  label?: string
  /** Placeholder for the prompt textarea. */
  placeholder?: string
  /** Popover placement relative to the icon. Default 'bottom-end'. */
  placement?: PopoverPlacement
  /** Extra classes on the trigger button. */
  className?: string
  disabled?: boolean
  /**
   * Inject a parent-owned funding instance to avoid a duplicate `useFundingSource`.
   * Omit and the component self-owns funding (used where the parent has none).
   */
  funding?: ReturnType<typeof useFundingSource>
  chainabit?: ReturnType<typeof useChainabitConnection>
}

/**
 * Map a funding + chainabit instance onto FundingSourceToggle's props.
 * Mirrors the call site in CreateWorkflowWizard so every spark renders the
 * same funding UI.
 */
function toToggleProps(
  funding: ReturnType<typeof useFundingSource>,
  chainabit: ReturnType<typeof useChainabitConnection>,
  providerModelProps: {
    providers: ReturnType<typeof useAIProviders>['data']
    isLoadingProviders: boolean
    providerModels: ReturnType<typeof useAIModelsByProvider>['data']
    isLoadingModels: boolean
    selectedProviderKey: string
    onProviderChange: (key: string) => void
    selectedModelKey: string
    onModelChange: (key: string) => void
  },
) {
  return {
    fundingSource: funding.fundingSource,
    onFundingSourceChange: funding.setFundingSource,
    selectedKeyRefId: funding.selectedKeyRefId,
    onKeyRefIdChange: funding.setSelectedKeyRefId,
    availableKeys: funding.availableKeys,
    selectedLocalKeyId: funding.selectedLocalKeyId,
    onLocalKeyIdChange: funding.setSelectedLocalKeyId,
    availableLocalKeys: funding.localKeys,
    localKeyAvailability: funding.localKeyAvailability,
    onAddLocalKey: funding.addLocalKey,
    onRemoveLocalKey: funding.removeLocalKey,
    onUpdateLocalKey: funding.updateLocalKey,
    onPairGateway: funding.pairGateway,
    onRefreshLocalKeys: funding.refreshLocalKeys,
    walletBalance: funding.walletBalance,
    canUseBYOK: funding.canUseBYOK,
    chainabitState: chainabit.state,
    chainabitModels: chainabit.models,
    onChainabitConnect: chainabit.reconnect,
    providers: providerModelProps.providers ?? [],
    isLoadingProviders: providerModelProps.isLoadingProviders,
    providerModels: providerModelProps.providerModels ?? [],
    isLoadingModels: providerModelProps.isLoadingModels,
    selectedProviderKey: providerModelProps.selectedProviderKey,
    onProviderChange: providerModelProps.onProviderChange,
    selectedModelKey: providerModelProps.selectedModelKey,
    onModelChange: providerModelProps.onModelChange,
  }
}

/**
 * One reusable "Generate with AI" control used across lens, workflow, and battle
 * creation. Icon-only by default (hover shows the label); clicking opens a popover
 * with the funding source (accordion) and a prompt textarea. Per-type behaviour
 * lives entirely in the ai-creation sublayer — this component only forwards
 * `generationType` + `context` and surfaces the typed result via `onGenerated`.
 */
export const GenerateWithAIButton: React.FC<GenerateWithAIButtonProps> = ({
  profileId,
  generationType,
  context,
  onGenerated,
  label = 'Generate with AI',
  placeholder = 'Describe what you want… or leave empty for an AI suggestion',
  placement = 'bottom-end',
  className,
  disabled,
  funding: injectedFunding,
  chainabit: injectedChainabit,
}) => {
  // Hooks must be called unconditionally; prefer the injected instance when given
  // so a parent wizard's funding state isn't duplicated.
  const [selectedProviderKey, setSelectedProviderKey] = useState('')
  const [selectedModelKey, setSelectedModelKey] = useState('')
  const { data: providers = [], isLoading: isLoadingProviders } = useAIProviders()
  const { data: providerModels = [], isLoading: isLoadingModels } = useAIModelsByProvider(
    selectedProviderKey || null,
  )

  const ownFunding = useFundingSource(selectedProviderKey)
  const ownChainabit = useChainabitConnection()
  const funding = injectedFunding ?? ownFunding
  const chainabit = injectedChainabit ?? ownChainabit

  // Sync provider from selected cloud BYOK key
  useEffect(() => {
    if (funding.fundingSource !== 'user_byok_cloud') return
    const key = funding.availableKeys.find((k) => k.id === funding.selectedKeyRefId)
    if (key && key.providerKey !== selectedProviderKey) {
      setSelectedProviderKey(key.providerKey)
      setSelectedModelKey('')
    }
  }, [funding.fundingSource, funding.selectedKeyRefId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync provider from selected local BYOK key
  useEffect(() => {
    if (funding.fundingSource !== 'user_byok_local') return
    const localKey = funding.localKeys.find((k) => k.id === funding.selectedLocalKeyId)
    if (localKey && localKey.provider !== 'ollama' && localKey.provider !== selectedProviderKey) {
      setSelectedProviderKey(localKey.provider)
      setSelectedModelKey('')
    }
  }, [funding.fundingSource, funding.selectedLocalKeyId]) // eslint-disable-line react-hooks/exhaustive-deps

  const { generate, isGenerating, error, resetError } = useAICreationGeneration({
    profileId,
    generationType,
    context,
    resolveLocalKey: funding.resolveLocalKey,
    fundingPreference: {
      fundingSource: funding.fundingSource,
      selectedKeyRefId: funding.selectedKeyRefId,
      localKeyId: funding.selectedLocalKeyId,
      providerId: selectedProviderKey,
      modelId: selectedModelKey,
    },
  })

  const [open, setOpen] = useState(false)
  const [slide, setSlide] = useState(0)
  const [prompt, setPrompt] = useState('')
  const anchorRef = useRef<HTMLButtonElement>(null)
  const textAreaId = useId()

  const handleGenerate = useCallback(async () => {
    if (!profileId) return
    resetError()
    const output = await generate(prompt.trim() ? prompt : null)
    if (output) {
      onGenerated(output)
      setOpen(false)
    }
  }, [profileId, prompt, generate, resetError, onGenerated])

  const SLIDES = 2

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={label}
        title={label}
        className={`inline-flex items-center justify-center rounded-lg p-1.5 text-primary-yellow-500 transition-colors hover:text-primary-yellow-600 hover:bg-primary-yellow-500/10 disabled:opacity-50 disabled:cursor-not-allowed ${
          open ? 'bg-primary-yellow-500/10' : ''
        } ${className ?? ''}`}
      >
        <Sparkles size={16} />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={anchorRef}
        placement={placement}
        className="w-[calc(100vw-2rem)] sm:w-[32rem] max-w-[32rem] p-0 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-greyscale-400">
              {label}
            </span>
          </div>
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: SLIDES }).map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSlide(i)}
                className={`rounded-full transition-all ${
                  i === slide
                    ? 'w-4 h-1.5 bg-primary-yellow-500'
                    : 'w-1.5 h-1.5 bg-greyscale-300 dark:bg-greyscale-600 hover:bg-greyscale-400'
                }`}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Carousel track */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${slide * 100}%)` }}
          >
            {/* Slide 1 — Funding & model */}
            <div className="w-full shrink-0 px-5 py-4 overflow-y-auto max-h-[28rem]">
              <p className="text-[11px] font-semibold text-greyscale-400 uppercase tracking-wide mb-3">
                Funding &amp; Model
              </p>
              <FundingSourceToggle
                {...toToggleProps(funding, chainabit, {
                  providers,
                  isLoadingProviders,
                  providerModels,
                  isLoadingModels,
                  selectedProviderKey,
                  onProviderChange: (key) => {
                    setSelectedProviderKey(key)
                    setSelectedModelKey('')
                  },
                  selectedModelKey,
                  onModelChange: setSelectedModelKey,
                })}
              />
            </div>

            {/* Slide 2 — Prompt */}
            <div className="w-full shrink-0 px-5 py-4 flex flex-col gap-3">
              <p className="text-[11px] font-semibold text-greyscale-400 uppercase tracking-wide">
                Prompt
              </p>
              <TextArea
                id={textAreaId}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                maxLength={2000}
                minRows={4}
                maxRows={8}
                disabled={isGenerating}
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-greyscale-400">Uses your selected funding source</span>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleGenerate}
                  isLoading={isGenerating}
                  disabled={disabled || !profileId}
                  className="gap-1.5"
                >
                  <Sparkles size={13} />
                  {prompt.trim() ? 'Generate' : 'Suggest'}
                </Button>
              </div>
              {error && (
                <Alert variant="error" title={friendlyAIError(error.code)} onDismiss={resetError}>
                  {error.message}
                </Alert>
              )}
            </div>
          </div>
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-surface-border">
          <button
            type="button"
            onClick={() => setSlide((s) => Math.max(0, s - 1))}
            disabled={slide === 0}
            className="inline-flex items-center gap-1 text-xs text-greyscale-400 hover:text-greyscale-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={14} />
            Back
          </button>
          <span className="text-[11px] text-greyscale-400">{slide + 1} / {SLIDES}</span>
          <button
            type="button"
            onClick={() => setSlide((s) => Math.min(SLIDES - 1, s + 1))}
            disabled={slide === SLIDES - 1}
            className="inline-flex items-center gap-1 text-xs text-greyscale-400 hover:text-greyscale-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Next
            <ChevronRight size={14} />
          </button>
        </div>
      </Popover>
    </>
  )
}
