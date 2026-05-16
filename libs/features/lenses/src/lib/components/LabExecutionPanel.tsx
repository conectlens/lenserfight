import { getMediaCapabilities } from '@lenserfight/providers'
import { AIProvider, AIProviderModel, LensParam, FundingSource, UserApiKey, WalletBalance, LensVersionParam, GenerativeMediaParams } from '@lenserfight/types'
import type { ChainabitConnectionState, ChainabitAiModel } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { copyTextToClipboard, renderLens, renderLensWithSnapshot } from '@lenserfight/utils/text'
import { Check, ClipboardCopy, FileJson, Loader2, Play, Square, Table2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { useLabParamForm } from '../hooks/useLabParamForm'

import { CsvImportDialog } from './CsvImportDialog'
import { FreeformInput } from './FreeformInput'
import { FundingSourceToggle } from './FundingSourceToggle'
import { JsonImportDialog } from './JsonImportDialog'
import { VersionParamFields } from './VersionParamFields'

import type { LocalKeyMeta } from '@lenserfight/types'

interface LabExecutionPanelProps {
  lensContent: string
  providers: AIProvider[]
  isLoadingProviders: boolean
  providerModels: AIProviderModel[]
  isLoadingModels: boolean
  selectedProviderKey: string
  selectedModelKey: string
  onProviderChange: (key: string) => void
  onModelChange: (key: string) => void
  onTriggerStream: (dto: TriggerLabExecutionDTO) => void
  isTriggeringExecution: boolean
  isStreaming: boolean
  isConnecting?: boolean
  onStop: () => void
  pendingRun?: null
  /** Legacy LensParam[] — used when versionParams is not provided. */
  params?: LensParam[]
  /** Typed version parameters — takes precedence over params when present. */
  versionParams?: LensVersionParam[]
  /** input_modalities from the selected AI model — used to gate file param types. */
  selectedModelInputModalities?: string[]
  /** output_modalities from the selected AI model — drives the modality selector. */
  selectedModelOutputModalities?: string[]
  /** Version id to pin execution to (from useVersionExecution). Passed to TriggerLabExecutionDTO. */
  /** True while version params are still loading (prevents freeform fallback flash). */
  isLoadingVersionParams?: boolean
  /** Upload a file for a file-type param. Returns the media_object_id. */
  onFileParamUpload?: (key: string, file: File) => Promise<string>
  /** When true, the panel is shown as a blurred, non-interactive preview. */
  isLocked?: boolean
  /** Optional message shown while the panel is locked. */
  lockedTitle?: string
  lockedDescription?: string
  /** Called when the user clicks the sign-in button in the locked state. */
  onSignIn?: () => void
  // Funding source
  fundingSource?: FundingSource
  onFundingSourceChange?: (source: FundingSource) => void
  selectedKeyRefId?: string | null
  onKeyRefIdChange?: (keyId: string) => void
  availableKeys?: UserApiKey[]
  walletBalance?: WalletBalance
  canUseBYOK?: boolean
  // Local BYOK
  selectedLocalKeyId?: string | null
  onLocalKeyIdChange?: (keyId: string) => void
  availableLocalKeys?: LocalKeyMeta[]
  onAddLocalKey?: (provider: string, label: string, rawKey: string) => Promise<void>
  onRemoveLocalKey?: (id: string) => Promise<void>
  onUpdateLocalKey?: (id: string, rawKey: string, label: string) => Promise<void>
  /** Called when the user first opens the provider dropdown — triggers lazy data fetch */
  onProviderDropdownOpen?: () => void
  // Chainabit connection state (for funding toggle)
  chainabitState?: ChainabitConnectionState
  chainabitModels?: ChainabitAiModel[] | null
  onChainabitConnect?: () => void
}

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  lensContent,
  providers,
  isLoadingProviders,
  providerModels,
  isLoadingModels,
  selectedProviderKey,
  selectedModelKey,
  onProviderChange,
  onModelChange,
  onTriggerStream,
  isTriggeringExecution,
  isStreaming,
  isConnecting,
  onStop,
  params,
  versionParams,
  selectedModelInputModalities,
  selectedModelOutputModalities,
  isLoadingVersionParams,
  onFileParamUpload,
  fundingSource,
  onFundingSourceChange,
  selectedKeyRefId,
  onKeyRefIdChange,
  availableKeys,
  walletBalance,
  canUseBYOK,
  selectedLocalKeyId,
  onLocalKeyIdChange,
  availableLocalKeys,
  onAddLocalKey,
  onRemoveLocalKey,
  onUpdateLocalKey,
  onProviderDropdownOpen,
  chainabitState,
  chainabitModels,
  onChainabitConnect,
  isLocked = false,
  lockedTitle = 'Run Lens',
  lockedDescription = 'Sign in or register with a Lenser profile to run this lens and manage executions.',
  onSignIn,
}) => {
  const form = useLabParamForm(lensContent, params, versionParams)

  // Modality selector — only shown when the model supports non-text output modalities
  const availableOutputModalities = selectedModelOutputModalities ?? ['text']
  const nonTextModalities = availableOutputModalities.filter((m) => m !== 'text')
  const hasMediaModalities = nonTextModalities.length > 0
  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'video' | 'audio' | 'music'>('text')
  const effectiveModality = hasMediaModalities ? selectedModality : 'text'

  // Media generation params (only used when effectiveModality !== 'text')
  const [mediaWidth, setMediaWidth] = useState(1024)
  const [mediaHeight, setMediaHeight] = useState(1024)
  const [mediaDurationS, setMediaDurationS] = useState(5)
  const [mediaAspectRatio, setMediaAspectRatio] = useState('16:9')

  // Read the wire-truth capability map for the active model. Drives which
  // media params we actually emit, so we never ship a value the adapter will
  // silently coerce.
  const mediaCapabilities = useMemo(
    () => getMediaCapabilities(selectedModelKey),
    [selectedModelKey],
  )

  const buildMediaParams = (): GenerativeMediaParams | undefined => {
    if (effectiveModality === 'text') return undefined
    const base: GenerativeMediaParams = { output_modality: effectiveModality }

    if (effectiveModality === 'image') {
      // Only include width/height when the model accepts custom sizes (OpenAI image).
      // For models that key off aspectRatio (Imagen, Stability, fal) we send aspect_ratio.
      if (mediaCapabilities.imageSizes.length > 0) {
        return { ...base, width: mediaWidth, height: mediaHeight }
      }
      if (mediaCapabilities.aspectRatios.length > 0) {
        const aspect = mediaCapabilities.aspectRatios.includes(mediaAspectRatio)
          ? mediaAspectRatio
          : mediaCapabilities.aspectRatios[0]
        return { ...base, aspect_ratio: aspect }
      }
      return base
    }

    if (effectiveModality === 'video') {
      const aspect = mediaCapabilities.aspectRatios.length === 0 || mediaCapabilities.aspectRatios.includes(mediaAspectRatio)
        ? mediaAspectRatio
        : mediaCapabilities.aspectRatios[0]
      const duration = mediaCapabilities.durations.length === 0 || mediaCapabilities.durations.includes(mediaDurationS)
        ? mediaDurationS
        : mediaCapabilities.durations[0]
      return { ...base, duration_s: duration, aspect_ratio: aspect }
    }

    if (effectiveModality === 'audio' || effectiveModality === 'music') {
      const duration = mediaCapabilities.durations.length === 0 || mediaCapabilities.durations.includes(mediaDurationS)
        ? mediaDurationS
        : mediaCapabilities.durations[0]
      return { ...base, duration_s: duration }
    }

    return base
  }

  const isLocalByok = fundingSource === 'user_byok_local'
  const isCloudByok = fundingSource === 'user_byok_cloud'

  // Derive effective provider key for isDisabled validation
  const effectiveProviderKey = isCloudByok
    ? (availableKeys?.find((k) => k.id === selectedKeyRefId)?.providerKey ?? '')
    : isLocalByok
      ? (availableLocalKeys?.find((k) => k.id === selectedLocalKeyId)?.provider ?? '')
      : selectedProviderKey

  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)
  const [copiedWithParams, setCopiedWithParams] = useState(false)

  const isNonEmpty = (v: unknown) => {
    if (v === undefined || v === null) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    return true
  }
  const canCopyWithParams = Object.values(form.inputValues).some(isNonEmpty)

  const handleCopyWithParameters = async () => {
    let rendered: string
    if (form.usingVersionParams && versionParams) {
      rendered = renderLensWithSnapshot(lensContent, form.inputValues, versionParams)
    } else if (form.legacyParamSchemas.length > 0) {
      rendered = renderLens(lensContent, form.inputValues as Record<string, unknown>, form.legacyParamSchemas)
    } else {
      const freeform = (form.inputValues['freeform'] as string) ?? ''
      rendered = freeform.trim().length > 0 ? `${lensContent}\n\n${freeform}` : lensContent
    }
    try {
      await copyTextToClipboard(rendered)
      setCopiedWithParams(true)
      setTimeout(() => setCopiedWithParams(false), 2000)
    } catch {
      // clipboard failed — leave state unchanged
    }
  }

  const isDisabled =
    isTriggeringExecution ||
    isStreaming ||
    (isLocalByok
      ? !selectedLocalKeyId || !selectedModelKey
      : !effectiveProviderKey || !selectedModelKey)

  return (
    <div className="flex flex-col rounded-2xl border border-surface-border bg-surface-base overflow-hidden max-h-[calc(100vh-8rem)]">
      {isLocked && (
        <div className="m-4 rounded-2xl border border-dashed border-surface-border bg-surface-raised p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{lockedTitle}</h4>
              <p className="mt-1 text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
                {lockedDescription}
              </p>
            </div>
            <button
              type="button"
              onClick={onSignIn}
              className="rounded-full border border-surface-border bg-surface-base px-3 py-1.5 text-xs font-medium text-greyscale-600 transition-colors hover:border-primary-yellow-500 hover:text-primary-yellow-600 dark:text-greyscale-300"
            >
              Login
            </button>
          </div>
        </div>
      )}

      <div className={`flex flex-col flex-1 min-h-0 ${isLocked ? 'pointer-events-none select-none blur-[1.5px] opacity-75 saturate-75' : ''}`}>
        <form
          onSubmit={(e) =>
            form.handleSubmit(e, {
              onTriggerStream,
              versionParams,
              selectedProviderKey,
              selectedModelKey,
              isLocalByok,
              availableLocalKeys,
              selectedLocalKeyId,
              lensContent,
              fundingSource,
              selectedKeyRefId,
              selectedModelInputModalities,
              output_modality: effectiveModality === 'text' ? undefined : effectiveModality,
              generative_media_params: buildMediaParams(),
            })
          }
          className="flex flex-col flex-1 min-h-0"
          aria-disabled={isLocked}
        >
          <div className="flex flex-col gap-4 px-4 pt-4 pb-4 border-b border-surface-border bg-surface-base shrink-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Run Lens</h4>
            {(isTriggeringExecution || isStreaming) && (
              <span className="flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
                <Loader2 size={12} className="animate-spin" />
                {isConnecting
                  ? 'Connecting…'
                  : effectiveModality !== 'text' && isStreaming
                    ? `Generating ${effectiveModality}…`
                    : isStreaming
                      ? 'Streaming…'
                      : 'Running…'}
              </span>
            )}
          </div>

          {/* 1. Funding Source + Provider / Model selector */}
          {fundingSource && onFundingSourceChange && onKeyRefIdChange && (
            <FundingSourceToggle
              fundingSource={fundingSource}
              onFundingSourceChange={onFundingSourceChange}
              selectedKeyRefId={selectedKeyRefId ?? null}
              onKeyRefIdChange={onKeyRefIdChange}
              availableKeys={availableKeys ?? []}
              selectedLocalKeyId={selectedLocalKeyId ?? null}
              onLocalKeyIdChange={onLocalKeyIdChange ?? (() => { })}
              availableLocalKeys={availableLocalKeys ?? []}
              onAddLocalKey={onAddLocalKey ?? (async () => { })}
              onRemoveLocalKey={onRemoveLocalKey}
              onUpdateLocalKey={onUpdateLocalKey}
              walletBalance={walletBalance}
              canUseBYOK={canUseBYOK ?? false}
              chainabitState={chainabitState}
              chainabitModels={chainabitModels}
              onChainabitConnect={onChainabitConnect}
              providers={providers}
              isLoadingProviders={isLoadingProviders}
              providerModels={providerModels}
              isLoadingModels={isLoadingModels}
              selectedProviderKey={selectedProviderKey}
              onProviderChange={onProviderChange}
              selectedModelKey={selectedModelKey}
              onModelChange={onModelChange}
              onProviderDropdownOpen={onProviderDropdownOpen}
            />
          )}

          {/* 2. Output Modality selector — only when model supports non-text outputs */}
          {hasMediaModalities && (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium text-greyscale-500 dark:text-greyscale-400">Output</span>
              <div className="flex flex-wrap gap-1.5">
                {(['text', ...nonTextModalities] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSelectedModality(m as typeof selectedModality)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${effectiveModality === m
                        ? 'bg-primary-yellow-500 text-greyscale-900'
                        : 'border border-surface-border bg-surface-raised text-greyscale-600 hover:border-primary-yellow-400 dark:text-greyscale-300'
                      }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2b. Media generation params */}
          {effectiveModality === 'image' && (
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-greyscale-500">Width</span>
                <input
                  type="number"
                  min={64} max={4096} step={64}
                  value={mediaWidth}
                  onChange={(e) => setMediaWidth(Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-greyscale-500">Height</span>
                <input
                  type="number"
                  min={64} max={4096} step={64}
                  value={mediaHeight}
                  onChange={(e) => setMediaHeight(Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                />
              </label>
            </div>
          )}
          {effectiveModality === 'video' && (
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-greyscale-500">Duration (s)</span>
                <input
                  type="number"
                  min={1} max={60} step={1}
                  value={mediaDurationS}
                  onChange={(e) => setMediaDurationS(Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs text-greyscale-500">Aspect ratio</span>
                <select
                  value={mediaAspectRatio}
                  onChange={(e) => setMediaAspectRatio(e.target.value)}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                >
                  {['16:9', '9:16', '1:1', '4:3', '3:4'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {(effectiveModality === 'audio' || effectiveModality === 'music') && (
            <label className="flex flex-col gap-1">
              <span className="text-xs text-greyscale-500">Duration (s)</span>
              <input
                type="number"
                min={1} max={300} step={1}
                value={mediaDurationS}
                onChange={(e) => setMediaDurationS(Number(e.target.value))}
                className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
              />
            </label>
          )}

          </div>{/* end top fixed section */}

          {/* Parameters Header — Fixed above the scrollable area */}
          {form.effectiveParams.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-surface-raised dark:bg-surface-raised border-b border-surface-border shrink-0 z-10">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Parameters
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setJsonImportOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Import from JSON"
                >
                  <FileJson size={12} />
                  JSON
                </button>
                <button
                  type="button"
                  onClick={() => setCsvImportOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  title="Import from CSV"
                >
                  <Table2 size={12} />
                  CSV
                </button>
              </div>
            </div>
          )}

          {/* Scrollable parameters area */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 px-4 pt-4 pb-6 bg-surface-raised/40 dark:bg-surface-raised/20">

          {/* Parameters Fields */}
          {form.effectiveParams.length > 0 && (
            <VersionParamFields
              params={form.effectiveParams}
              values={form.inputValues}
              errors={form.fieldErrors}
              onChange={form.handleChange}
              onFileUpload={onFileParamUpload}
              selectedModelInputModalities={selectedModelInputModalities}
            />
          )}

          {/* Loading skeleton while version params resolve */}
          {!form.usingVersionParams && isLoadingVersionParams && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-3">
              <Loader2 size={12} className="animate-spin" />
              Loading parameters…
            </div>
          )}

          {/* Freeform input (no params at all) */}
          {!form.usingVersionParams && !isLoadingVersionParams && form.effectiveParams.length === 0 && (
            <FreeformInput
              value={(form.inputValues['freeform'] as string) ?? ''}
              onChange={(v) => form.handleChange('freeform', v)}
            />
          )}

          </div>{/* end scrollable params */}

          {/* Run button — fixed at bottom */}
          <div className="px-4 py-3 border-t border-surface-border bg-surface-base shrink-0">
          {isStreaming ? (
            <Button
              type="button"
              onClick={onStop}
              className="w-full flex items-center justify-center gap-2 h-auto py-2.5 bg-red-600 hover:bg-red-700 text-white"
              disabled={isLocked}
            >
              <Square size={16} />
              <span>Stop</span>
            </Button>
          ) : (
            <div className="flex items-stretch gap-2">

              <Button
                type="submit"
                disabled={isDisabled || isLocked}
                className="flex-1 flex items-center justify-center gap-2 h-auto py-2.5"
              >
                {isTriggeringExecution ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Running…</span>
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    <span>Run</span>
                  </>
                )}
              </Button>
    {canCopyWithParams && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCopyWithParameters}
                  disabled={isLocked}
                  title="Copy lens prompt with filled parameter values"
                  className={`flex-shrink-0 flex items-center justify-center gap-2 h-auto py-2.5 px-4 rounded-xl border shadow-sm transition-all ${copiedWithParams
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-50 dark:hover:bg-emerald-900/40'
                    }`}
                >
                  {copiedWithParams ? (
                    <>
                      <Check size={16} strokeWidth={3} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCopy size={16} />
                      <span>Copy with Parameters</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
          </div>{/* end run button section */}
        </form>
      </div>

      <JsonImportDialog
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        versionParams={form.effectiveParams}
        onApply={form.applyImportedValues}
        currentValues={form.inputValues}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        versionParams={form.effectiveParams}
        onApply={form.applyImportedValues}
        currentValues={form.inputValues}
      />
    </div>
  )
}
