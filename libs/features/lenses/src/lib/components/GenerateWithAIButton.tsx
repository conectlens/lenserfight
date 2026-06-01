import { useAICreationGeneration } from '@lenserfight/infra/ai-creation'
import { useChainabitConnection } from '@lenserfight/features/store'
import { Accordion, Alert, Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { Popover, type PopoverPlacement } from '@lenserfight/ui/overlays'
import { KeyRound, Sparkles } from 'lucide-react'
import React, { useCallback, useId, useRef, useState } from 'react'

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
  const ownFunding = useFundingSource('')
  const ownChainabit = useChainabitConnection()
  const funding = injectedFunding ?? ownFunding
  const chainabit = injectedChainabit ?? ownChainabit

  const { generate, isGenerating, error, resetError } = useAICreationGeneration({
    profileId,
    generationType,
    context,
    resolveLocalKey: funding.resolveLocalKey,
  })

  const [open, setOpen] = useState(false)
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
        className="w-80 p-4"
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-yellow-500" />
            <span className="text-xs font-bold uppercase tracking-widest text-greyscale-400">
              {label}
            </span>
          </div>

          <Accordion type="single">
            <Accordion.Item title="Funding source" icon={<KeyRound size={14} />}>
              <FundingSourceToggle {...toToggleProps(funding, chainabit)} />
            </Accordion.Item>
          </Accordion>

          <TextArea
            id={textAreaId}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder}
            maxLength={2000}
            minRows={2}
            maxRows={5}
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
      </Popover>
    </>
  )
}
