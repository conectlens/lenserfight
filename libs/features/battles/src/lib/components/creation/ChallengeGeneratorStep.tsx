import { TextArea, SelectField } from '@lenserfight/ui/forms'
import { useFundingSource, FundingSourceToggle } from '@lenserfight/features/lenses'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { useChainabitConnection } from '@lenserfight/features/store'
import { executionService, walletApiClient } from '@lenserfight/data/repositories'
import { lookupModel, detectProvider, resolveWireModel } from '@lenserfight/providers'
import { normalizeError } from '@lenserfight/shared/error'
import {
  type GeneratedChallengeStatus,
  getGeneratorRequirements,
} from '@lenserfight/domain/battle-governance'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, ChevronDown, Lock, RefreshCw, Wand2, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

// ─── Props ──────────────────────────────────────────────────────────────────

export interface ChallengeGeneratorStepProps {
  challengeType: string
  /** The current question text — typed directly or filled from AI generation. */
  questionText: string
  onQuestionTextChange: (text: string) => void
  /** Optional generator lens. When set, AI generation is available. */
  generatorLensId: string | null
  onGeneratorLensChange: (lensId: string | null) => void
  difficulty: string
  onDifficultyChange: (difficulty: string) => void
  language: string
  onLanguageChange: (language: string) => void
  generationStatus: GeneratedChallengeStatus | null
  onGenerationStatusChange: (status: GeneratedChallengeStatus | null) => void
  onLock: () => void
  isLocked: boolean
  generationError: string | null
  onGenerationErrorChange: (err: string | null) => void
  /** Available lenses for selection (optional helper). */
  availableLenses: Array<{ id: string; title: string; slug: string }>
  /** Called when the component auto-selects a model for generation. */
  onGeneratorModelChange?: (modelId: string | null) => void
}

const LANGUAGE_OPTIONS = [
  { value: 'en', label: 'English' },
  { value: 'tr', label: 'Turkish' },
  { value: 'de', label: 'German' },
  { value: 'fr', label: 'French' },
  { value: 'es', label: 'Spanish' },
]

// ─── Component ──────────────────────────────────────────────────────────────

export function ChallengeGeneratorStep({
  challengeType,
  questionText,
  onQuestionTextChange,
  generatorLensId,
  onGeneratorLensChange,
  difficulty,
  onDifficultyChange,
  language,
  onLanguageChange,
  generationStatus,
  onGenerationStatusChange,
  onLock,
  isLocked,
  generationError,
  onGenerationErrorChange,
  availableLenses,
  onGeneratorModelChange,
}: ChallengeGeneratorStepProps) {
  const [showAiPanel, setShowAiPanel] = useState(false)

  // ── Funding source (internal — challenge generation funding) ───────────────
  const genFunding = useFundingSource('')
  const chainabit = useChainabitConnection()

  // ── Derive effective provider key from funding state ───────────────────────
  const effectiveProviderKey = useMemo(() => {
    if (genFunding.fundingSource === 'user_byok_cloud') {
      return (
        genFunding.availableKeys.find((k) => k.id === genFunding.selectedKeyRefId)?.providerKey ??
        ''
      )
    }
    if (genFunding.fundingSource === 'user_byok_local') {
      return (
        genFunding.localKeys.find((k) => k.id === genFunding.selectedLocalKeyId)?.provider ?? ''
      )
    }
    return ''
  }, [
    genFunding.fundingSource,
    genFunding.selectedKeyRefId,
    genFunding.selectedLocalKeyId,
    genFunding.availableKeys,
    genFunding.localKeys,
  ])

  // ── Auto-select first available model for the derived provider ─────────────
  const { data: providerModels = [] } = useAIModelsByProvider(effectiveProviderKey || null)
  useAIProviders() // Keep warm

  useEffect(() => {
    if (genFunding.fundingSource === 'platform_credit' && chainabit.state === 'connected') {
      const first = chainabit.models?.[0]?.modelKey ?? null
      onGeneratorModelChange?.(first)
      return
    }
    if (providerModels.length > 0) {
      onGeneratorModelChange?.(providerModels[0].key)
      return
    }
    onGeneratorModelChange?.(null)
  }, [genFunding.fundingSource, chainabit.state, chainabit.models, providerModels]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Generator requirements ─────────────────────────────────────────────────
  const requirements = useMemo(() => getGeneratorRequirements(challengeType), [challengeType])
  const difficultyLevels = requirements?.difficultyLevels ?? ['easy', 'medium', 'hard']

  const difficultyOptions = difficultyLevels.map((d) => ({
    value: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
  }))
  const lensOptions = [
    { value: '', label: 'None (use platform default)' },
    ...availableLenses.map((l) => ({ value: l.id, label: l.title })),
  ]

  // ── Generation status helpers ──────────────────────────────────────────────
  const isGenerating = generationStatus === 'generating'
  const isReady = generationStatus === 'ready'
  const isFailed = generationStatus === 'failed'
  const canGenerate = !isGenerating && !isLocked

  // ── Derive active model key ────────────────────────────────────────────────
  const activeModelKey = useMemo(() => {
    if (genFunding.fundingSource === 'platform_credit') {
      return chainabit.models?.[0]?.modelKey ?? ''
    }
    return providerModels[0]?.key ?? ''
  }, [genFunding.fundingSource, chainabit.models, providerModels])

  // ── Trigger generation ─────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerate) return
    if (!activeModelKey) {
      onGenerationErrorChange(
        'No AI model available for the selected funding source. Try a different funding option.'
      )
      return
    }
    onGenerationStatusChange('generating')
    onGenerationErrorChange(null)

    const modelDescriptor = lookupModel(activeModelKey)

    // Text models use execute-stream (SSE). Media models (image/video/audio/music)
    // route through trigger-execution for lens-based execution.
    if (modelDescriptor?.kind === 'text' || !modelDescriptor) {
      try {
        const provider = (detectProvider(activeModelKey) ?? 'openai') as
          | 'openai'
          | 'anthropic'
          | 'google'
          | 'mistral'
        const wireModel = resolveWireModel(activeModelKey)
        const messages = [
          {
            role: 'system' as const,
            content: `You are a challenge question generator for competitive AI battles. Generate exactly one ${difficulty} difficulty challenge question of type "${challengeType}" in ${language}. Output only the question text — no preamble, no explanation, no numbering.`,
          },
          {
            role: 'user' as const,
            content: `Generate a ${difficulty} ${challengeType} challenge question.`,
          },
        ]

        let accumulated = ''
        const controller = new AbortController()

        await new Promise<void>((resolve, reject) => {
          const callbacks = {
            onStart: () => {},
            onToken: (token: string) => {
              accumulated += token
            },
            onEnd: () => {
              let result = accumulated.trim()
              try {
                const parsed = JSON.parse(result) as Record<string, unknown>
                result = (parsed['question'] ??
                  parsed['question_text'] ??
                  parsed['prompt'] ??
                  result) as string
              } catch {
                /* plain text */
              }
              onQuestionTextChange(result.trim())
              onGenerationStatusChange('ready')
              resolve()
            },
            onError: (msg: string) => reject(new Error(msg)),
          }

          const streamPromise =
            genFunding.fundingSource === 'user_byok_cloud'
              ? walletApiClient.streamWithByok(
                  {
                    key_ref_id: genFunding.selectedKeyRefId ?? '',
                    provider,
                    model: wireModel,
                    messages,
                  },
                  controller.signal,
                  callbacks
                )
              : walletApiClient.streamWithWallet(
                  { provider, model: wireModel, messages },
                  controller.signal,
                  callbacks
                )

          streamPromise.then(resolve).catch(reject)
        })
      } catch (err) {
        onGenerationStatusChange('failed')
        onGenerationErrorChange(normalizeError(err).message)
      }
      return
    }

    // Media model path — lens-based execution via trigger-execution
    try {
      const execResult = await executionService.triggerExecution({
        ...(generatorLensId ? { lens_id: generatorLensId } : {}),
        model_id: activeModelKey,
        input_snapshot: {
          challenge_type: challengeType,
          difficulty,
          language,
        },
        funding_source: genFunding.fundingSource,
        byok_key_ref_id: genFunding.selectedKeyRefId ?? undefined,
        origin_type: 'battle',
      })
      const execRunId = execResult?.execution_run_id
      if (!execRunId) throw new Error('No run ID returned')

      let run = await executionService.pollRunStatus(execRunId)
      let attempts = 0
      while (run.status !== 'succeeded' && run.status !== 'failed' && attempts < 30) {
        await new Promise((r) => setTimeout(r, 2000))
        run = await executionService.pollRunStatus(execRunId)
        attempts++
      }
      if (run.status === 'failed') throw new Error('Generation failed')

      const artifacts = await executionService.getArtifacts(execRunId)
      const primary = artifacts.find((a) => a.isPrimaryOutput)
      const text = primary?.contentText ?? ''
      let questionResult = text
      try {
        const parsed = JSON.parse(text)
        questionResult = parsed.question ?? parsed.question_text ?? parsed.prompt ?? text
      } catch {
        /* plain text */
      }

      onQuestionTextChange(questionResult.trim())
      onGenerationStatusChange('ready')
    } catch (err) {
      onGenerationStatusChange('failed')
      onGenerationErrorChange(normalizeError(err).message)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── Primary: direct question input ──────────────────────────── */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
          Challenge question
          {isLocked && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Lock size={10} />
              Locked
            </span>
          )}
        </label>
        <TextArea
          value={questionText}
          onChange={(e) => {
            if (isLocked) return
            onQuestionTextChange(e.target.value)
            // Reset generation status when user edits manually
            if (generationStatus === 'ready' || generationStatus === 'locked') {
              onGenerationStatusChange(null)
            }
          }}
          placeholder="Type your challenge question here, or use AI generation below…"
          minRows={4}
          maxRows={12}
          disabled={isLocked}
        />
        {questionText.trim() && !isLocked && (
          <p className="mt-1 text-right text-xs text-greyscale-400">{questionText.length} chars</p>
        )}
      </div>

      {/* ── Lock button (when AI generated and ready) ────────────────── */}
      {isReady && !isLocked && questionText.trim() && (
        <button
          type="button"
          onClick={onLock}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-green-500 bg-green-50 px-4 py-2.5 text-sm font-medium text-green-700 transition-all hover:bg-green-100 dark:border-green-600 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
        >
          <Lock size={16} />
          Lock challenge — make immutable
        </button>
      )}

      {/* ── Locked confirmation ───────────────────────────────────────── */}
      {isLocked && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
          <Check size={16} className="text-green-600" />
          <span className="text-xs font-medium text-green-700 dark:text-green-400">
            Challenge locked. Both contestants will receive this exact question.
          </span>
        </div>
      )}

      {/* ── AI generation toggle ─────────────────────────────────────── */}
      {!isLocked && (
        <button
          type="button"
          onClick={() => setShowAiPanel((v) => !v)}
          className="flex w-full items-center justify-between gap-2 rounded-xl border border-surface-border bg-surface-raised px-4 py-2.5 text-sm text-greyscale-600 transition-colors hover:border-greyscale-300 dark:text-greyscale-400 dark:hover:border-greyscale-600"
        >
          <span className="flex items-center gap-2 font-medium">
            <Wand2 size={14} className="text-primary-yellow-500" />
            Generate with AI
            <span className="text-xs font-normal text-greyscale-400">(optional)</span>
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${showAiPanel ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {/* ── AI generation panel ─────────────────────────────────────── */}
      <AnimatePresence>
        {showAiPanel && !isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-4 rounded-xl border border-surface-border bg-surface-raised p-4">
              {/* Lens selector (optional) */}
              <SelectField
                label="Generator lens (optional)"
                value={generatorLensId ?? ''}
                onChange={(v) => onGeneratorLensChange(v || null)}
                options={lensOptions}
                placeholder="None (use platform default)"
              />

              {/* Difficulty */}
              <SelectField
                label="Difficulty"
                value={difficulty}
                onChange={onDifficultyChange}
                options={difficultyOptions}
              />

              {/* Language */}
              <SelectField
                label="Language"
                value={language}
                onChange={onLanguageChange}
                options={LANGUAGE_OPTIONS}
              />

              {/* Funding source */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-greyscale-400">
                  Generation funding
                </label>
                <FundingSourceToggle
                  fundingSource={genFunding.fundingSource}
                  onFundingSourceChange={genFunding.setFundingSource}
                  selectedKeyRefId={genFunding.selectedKeyRefId}
                  onKeyRefIdChange={genFunding.setSelectedKeyRefId}
                  availableKeys={genFunding.availableKeys}
                  selectedLocalKeyId={genFunding.selectedLocalKeyId}
                  onLocalKeyIdChange={genFunding.setSelectedLocalKeyId}
                  availableLocalKeys={genFunding.localKeys}
                  localKeyAvailability={genFunding.localKeyAvailability}
                  onAddLocalKey={genFunding.addLocalKey}
                  onRemoveLocalKey={genFunding.removeLocalKey}
                  onUpdateLocalKey={genFunding.updateLocalKey}
                  onPairGateway={genFunding.pairGateway}
                  onRefreshLocalKeys={genFunding.refreshLocalKeys}
                  walletBalance={genFunding.walletBalance}
                  canUseBYOK={genFunding.canUseBYOK}
                  chainabitState={chainabit.state}
                  chainabitModels={chainabit.models}
                  onChainabitConnect={chainabit.reconnect}
                />
              </div>

              {/* Generate button */}
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!canGenerate}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-yellow-500 px-4 py-2.5 text-sm font-medium text-greyscale-900 transition-all hover:bg-primary-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Generating…
                  </>
                ) : isFailed ? (
                  <>
                    <RefreshCw size={15} />
                    Retry generation
                  </>
                ) : (
                  <>
                    <Wand2 size={15} />
                    Generate question
                  </>
                )}
              </button>

              {/* Generation error */}
              {generationError && (
                <div className="flex items-start gap-2 rounded-lg border border-status-red/20 bg-status-red/5 p-3">
                  <XCircle size={14} className="mt-0.5 shrink-0 text-status-red" />
                  <p className="text-xs text-status-red">{generationError}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Fairness notice ──────────────────────────────────────────── */}
      <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <AlertTriangle size={14} className="mt-0.5 shrink-0 text-blue-500" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          Both contestants will see the exact same question and rules. Once locked, the question
          cannot be changed.
        </p>
      </div>
    </div>
  )
}
