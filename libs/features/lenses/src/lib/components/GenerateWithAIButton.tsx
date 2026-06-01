import { useAICreationGeneration } from '@lenserfight/infra/ai-creation'
import { useChainabitConnection } from '@lenserfight/features/store'
import { useAIProviders, useAIModelsByProvider } from '@lenserfight/features/generations'
import { Alert, Button } from '@lenserfight/ui/components'
import { TextArea } from '@lenserfight/ui/forms'
import { Popover, type PopoverPlacement } from '@lenserfight/ui/overlays'
import { buildImportJsonTemplate, buildImportCsvTemplate } from '@lenserfight/domain/lens-parameters'
import type { LensVersionParam } from '@lenserfight/types'
import { Check, ChevronLeft, ChevronRight, Copy, Sparkles } from 'lucide-react'
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'

import { useFundingSource } from '../hooks/useFundingSource'
import { coerceJsonImport, coerceCsvRow, parseCsvText } from '../hooks/useParamImport'

import { friendlyAIError } from './aiCreationError'
import { FundingSourceToggle } from './FundingSourceToggle'

import type {
  AICreationOutput,
  BattleCreationContext,
  GeneratedBattleResult,
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
  /**
   * When provided, the JSON/CSV import slides use the typed domain template functions
   * (same format as JsonImportDialog / CsvImportDialog) and call `onImportedValues`
   * instead of `onGenerated`. Omit to keep the creation-mode import format.
   */
  versionParams?: LensVersionParam[]
  /** Lens title embedded in import templates so external AI understands the context. */
  lensTitle?: string
  /**
   * Called when `versionParams` is provided and the user applies a JSON/CSV import.
   * Receives coerced param values keyed by label.
   */
  onImportedValues?: (values: Record<string, unknown>) => void
}

// ─── Import helpers ────────────────────────────────────────────────────────────

function getJsonTemplate(type: GenerationType): string {
  if (type === 'workflow') {
    return JSON.stringify({ title: 'Workflow title here', description: 'What this workflow does' }, null, 2)
  }
  if (type === 'battle') {
    return JSON.stringify(
      {
        title: 'Battle title here',
        task_prompt: 'The shared challenge every contender receives',
        suggestedTaskSource: 'challenge',
        suggestedContenderStructure: 'ai_vs_ai',
        suggestedJudgingMode: 'community_vote',
      },
      null,
      2,
    )
  }
  return JSON.stringify(
    {
      title: 'Lens title here',
      description: 'What this lens does',
      content: 'Prompt template — use [[param]] for each input.\nExample: You are a [[role]] tasked with [[goal]].',
      params: ['role', 'goal'],
      tags: ['tag-slug'],
    },
    null,
    2,
  )
}

function getCsvTemplate(type: GenerationType): string {
  if (type === 'workflow') {
    return `title,description\n"Workflow title","What this workflow does"`
  }
  if (type === 'battle') {
    return `title,task_prompt,suggestedContenderStructure\n"Battle title","Challenge prompt","ai_vs_ai"`
  }
  return `title,description,content,params,tags\n"Lens title","Description","Template with [[role]] and [[goal]]","role|goal","tag-slug"`
}

function parseImportJson(raw: string, generationType: GenerationType): AICreationOutput | string {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return `Invalid JSON — ${e instanceof Error ? e.message : 'parse error'}`
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return 'JSON must be a plain object, e.g. { "title": "…" }'
  }

  const obj = parsed as Record<string, unknown>

  if (generationType === 'lens') {
    const title = typeof obj.title === 'string' ? obj.title.trim() : ''
    if (!title) return 'Missing required field: title'
    const content = typeof obj.content === 'string' ? obj.content : ''
    const description = typeof obj.description === 'string' ? obj.description : ''
    const suggestedTagSlugs = (Array.isArray(obj.tags) ? obj.tags : []).filter(
      (t): t is string => typeof t === 'string',
    )
    const params = (Array.isArray(obj.params) ? obj.params : []).flatMap((p) => {
      if (typeof p === 'string' && p.trim()) return [{ label: p.trim() }]
      if (typeof p === 'object' && p !== null && typeof (p as Record<string, unknown>).label === 'string') {
        return [{ label: ((p as Record<string, unknown>).label as string).trim() }]
      }
      return []
    })
    return { type: 'lens', result: { title, content, description, suggestedTagSlugs, params } }
  }

  if (generationType === 'workflow') {
    const title = typeof obj.title === 'string' ? obj.title.trim() : ''
    if (!title) return 'Missing required field: title'
    const description = typeof obj.description === 'string' ? obj.description : ''
    const suggestedLensIds = (Array.isArray(obj.suggestedLensIds) ? obj.suggestedLensIds : []).filter(
      (id): id is string => typeof id === 'string',
    )
    return { type: 'workflow', result: { title, description, suggestedLensIds } }
  }

  if (generationType === 'battle') {
    const title = typeof obj.title === 'string' ? obj.title.trim() : ''
    if (!title) return 'Missing required field: title'
    const task_prompt = typeof obj.task_prompt === 'string' ? obj.task_prompt : ''
    const r: GeneratedBattleResult = { title, task_prompt }
    if (obj.suggestedTaskSource === 'lens' || obj.suggestedTaskSource === 'workflow' || obj.suggestedTaskSource === 'challenge') {
      r.suggestedTaskSource = obj.suggestedTaskSource
    }
    if (obj.suggestedContenderStructure === 'ai_vs_ai' || obj.suggestedContenderStructure === 'human_vs_human' || obj.suggestedContenderStructure === 'human_vs_ai') {
      r.suggestedContenderStructure = obj.suggestedContenderStructure
    }
    if (obj.suggestedJudgingMode === 'community_vote' || obj.suggestedJudgingMode === 'ai_judge' || obj.suggestedJudgingMode === 'rubric_score' || obj.suggestedJudgingMode === 'auto_score') {
      r.suggestedJudgingMode = obj.suggestedJudgingMode
    }
    return { type: 'battle', result: r }
  }

  return 'Unknown generation type'
}

function parseImportCsv(raw: string, generationType: GenerationType): AICreationOutput | string {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
  if (lines.length < 2) return 'CSV needs at least two rows: a header row and one data row'

  function splitLine(line: string): string[] {
    const fields: string[] = []
    let field = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
        else if (ch === '"') inQ = false
        else field += ch
      } else {
        if (ch === '"') inQ = true
        else if (ch === ',') { fields.push(field); field = '' }
        else field += ch
      }
    }
    fields.push(field)
    return fields
  }

  const headers = splitLine(lines[0]).map((h) => h.trim())
  const values = splitLine(lines[1])
  const obj: Record<string, string> = {}
  headers.forEach((h, i) => { obj[h] = (values[i] ?? '').trim() })

  if (generationType === 'lens') {
    const title = obj['title'] ?? ''
    if (!title) return 'Missing required column: title'
    const params = obj['params']
      ? obj['params'].split(/[|;]/).map((p) => ({ label: p.trim() })).filter((p) => p.label)
      : []
    const suggestedTagSlugs = obj['tags']
      ? obj['tags'].split(/[|;]/).map((t) => t.trim()).filter(Boolean)
      : []
    return {
      type: 'lens',
      result: { title, content: obj['content'] ?? '', description: obj['description'] ?? '', suggestedTagSlugs, params },
    }
  }

  if (generationType === 'workflow') {
    const title = obj['title'] ?? ''
    if (!title) return 'Missing required column: title'
    return { type: 'workflow', result: { title, description: obj['description'] ?? '', suggestedLensIds: [] } }
  }

  if (generationType === 'battle') {
    const title = obj['title'] ?? ''
    if (!title) return 'Missing required column: title'
    return { type: 'battle', result: { title, task_prompt: obj['task_prompt'] ?? '' } }
  }

  return 'Unknown generation type'
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
  versionParams,
  lensTitle,
  onImportedValues,
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
  const [importJsonText, setImportJsonText] = useState('')
  const [importCsvText, setImportCsvText] = useState('')
  const [importError, setImportError] = useState<string | null>(null)
  const [copied, setCopied] = useState<'json' | 'csv' | null>(null)
  const anchorRef = useRef<HTMLButtonElement>(null)
  const textAreaId = useId()

  useEffect(() => {
    if (!open) {
      setImportError(null)
      setCopied(null)
    }
  }, [open])

  // When versionParams is provided, use the typed domain templates (same as JsonImportDialog/CsvImportDialog).
  // Otherwise fall back to the creation-format templates.
  const lensContext = useMemo(
    () => (lensTitle ? { title: lensTitle } : undefined),
    [lensTitle],
  )

  const jsonTemplate = useMemo(
    () => versionParams && versionParams.length > 0
      ? buildImportJsonTemplate(versionParams, lensContext)
      : getJsonTemplate(generationType),
    [versionParams, lensContext, generationType],
  )

  const csvTemplate = useMemo(
    () => versionParams && versionParams.length > 0
      ? buildImportCsvTemplate(versionParams, lensContext)
      : getCsvTemplate(generationType),
    [versionParams, lensContext, generationType],
  )

  const handleCopyTemplate = useCallback(
    async (format: 'json' | 'csv') => {
      const template = format === 'json' ? jsonTemplate : csvTemplate
      try {
        await navigator.clipboard.writeText(template)
        setCopied(format)
        setTimeout(() => setCopied(null), 2000)
      } catch {
        // clipboard denied — do nothing
      }
    },
    [jsonTemplate, csvTemplate],
  )

  const handleJsonImport = useCallback(() => {
    setImportError(null)
    if (versionParams && versionParams.length > 0) {
      // Param-values mode: use typed coercion, same parser as JsonImportDialog
      const { values, errors } = coerceJsonImport(importJsonText.trim(), versionParams)
      const parseError = errors['_parse']
      if (parseError) { setImportError(parseError); return }
      const coercionErrors = Object.values(errors).filter(Boolean)
      if (coercionErrors.length > 0) { setImportError(coercionErrors[0]); return }
      if (Object.keys(values).length === 0) { setImportError('No matching parameter values found'); return }
      onImportedValues?.(values)
      setOpen(false)
      return
    }
    // Creation mode: map JSON to AICreationOutput
    const result = parseImportJson(importJsonText.trim(), generationType)
    if (typeof result === 'string') { setImportError(result); return }
    onGenerated(result)
    setOpen(false)
  }, [importJsonText, versionParams, generationType, onGenerated, onImportedValues])

  const handleCsvImport = useCallback(() => {
    setImportError(null)
    if (versionParams && versionParams.length > 0) {
      // Param-values mode: use typed coercion, same parser as CsvImportDialog
      const parsed = parseCsvText(importCsvText.trim())
      if (parsed.rows.length === 0) { setImportError('CSV needs at least one data row after the header'); return }
      const { values, errors } = coerceCsvRow(parsed.headers, parsed.rows[0], versionParams)
      const coercionErrors = Object.values(errors).filter(Boolean)
      if (coercionErrors.length > 0) { setImportError(coercionErrors[0]); return }
      if (Object.keys(values).length === 0) { setImportError('No matching parameter columns found'); return }
      onImportedValues?.(values)
      setOpen(false)
      return
    }
    // Creation mode: map CSV to AICreationOutput
    const result = parseImportCsv(importCsvText.trim(), generationType)
    if (typeof result === 'string') { setImportError(result); return }
    onGenerated(result)
    setOpen(false)
  }, [importCsvText, versionParams, generationType, onGenerated, onImportedValues])

  const handleGenerate = useCallback(async () => {
    if (!profileId) return
    resetError()
    const output = await generate(prompt.trim() ? prompt : null)
    if (output) {
      onGenerated(output)
      setOpen(false)
    }
  }, [profileId, prompt, generate, resetError, onGenerated])

  const SLIDES = 4

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
            <div className="w-full shrink-0 px-5 py-4 flex flex-col gap-3" style={{ minWidth: '100%' }}>
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

            {/* Slide 3 — Import from JSON */}
            <div className="w-full shrink-0 px-5 py-4 flex flex-col gap-3" style={{ minWidth: '100%' }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-greyscale-400 uppercase tracking-wide">
                  Import from JSON
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('json')}
                  className="inline-flex items-center gap-1 text-xs text-greyscale-400 hover:text-greyscale-600 transition-colors"
                >
                  {copied === 'json' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'json' ? 'Copied!' : 'Copy template'}
                </button>
              </div>
              <p className="text-[11px] text-greyscale-400 -mt-1">
                Copy the template, fill it in with any AI tool, then paste the result here.
              </p>
              <TextArea
                value={importJsonText}
                onChange={(e) => { setImportJsonText(e.target.value); setImportError(null) }}
                placeholder={`Paste JSON here…\n\nClick "Copy template" to get the correct format.`}
                minRows={5}
                maxRows={10}
              />
              {importError && slide === 2 && (
                <Alert variant="error" title="Import failed" onDismiss={() => setImportError(null)}>
                  {importError}
                </Alert>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleJsonImport}
                  disabled={!importJsonText.trim()}
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Slide 4 — Import from CSV */}
            <div className="w-full shrink-0 px-5 py-4 flex flex-col gap-3" style={{ minWidth: '100%' }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-greyscale-400 uppercase tracking-wide">
                  Import from CSV
                </p>
                <button
                  type="button"
                  onClick={() => handleCopyTemplate('csv')}
                  className="inline-flex items-center gap-1 text-xs text-greyscale-400 hover:text-greyscale-600 transition-colors"
                >
                  {copied === 'csv' ? <Check size={12} /> : <Copy size={12} />}
                  {copied === 'csv' ? 'Copied!' : 'Copy template'}
                </button>
              </div>
              <p className="text-[11px] text-greyscale-400 -mt-1">
                Row 1 = headers, row 2 = values. Use <code className="text-[10px]">|</code> to separate multiple params or tags.
              </p>
              <TextArea
                value={importCsvText}
                onChange={(e) => { setImportCsvText(e.target.value); setImportError(null) }}
                placeholder={`Paste CSV here…\n\nClick "Copy template" to get the correct format.`}
                minRows={5}
                maxRows={10}
              />
              {importError && slide === 3 && (
                <Alert variant="error" title="Import failed" onDismiss={() => setImportError(null)}>
                  {importError}
                </Alert>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCsvImport}
                  disabled={!importCsvText.trim()}
                >
                  Apply
                </Button>
              </div>
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
