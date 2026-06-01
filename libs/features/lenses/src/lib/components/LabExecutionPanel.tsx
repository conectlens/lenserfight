import { getMediaCapabilities } from '@lenserfight/providers'
import { AIProvider, AIProviderModel, LensParam, FundingSource, UserApiKey, WalletBalance, LensVersionParam, GenerativeMediaParams } from '@lenserfight/types'
import type { ChainabitConnectionState, ChainabitAiModel } from '@lenserfight/types'

import type { LocalKeyAvailabilityReason } from '../hooks/useLocalKeyStore'
import { Button } from '@lenserfight/ui/components'
import { buildInputSnapshot, renderTemplateWithSnapshot } from '@lenserfight/domain/lens-parameters'
import { copyTextToClipboard } from '@lenserfight/utils/text'
import { Check, ClipboardCopy, FileJson, Loader2, Play, Square, Table2 } from 'lucide-react'
import React, { useMemo, useState } from 'react'

import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { useLabParamForm } from '../hooks/useLabParamForm'

import { resolveLensFileParamsForCopy } from '../utils/resolveLensFileParamsForExecution'

import { CsvImportDialog } from './CsvImportDialog'
import { FreeformInput } from './FreeformInput'
import { FundingSourceToggle } from './FundingSourceToggle'
import { GenerateWithAIButton } from './GenerateWithAIButton'
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
  /** Output kind declared on the lens's output_contract.kind — pre-selects the modality
   *  and is used (in the parent) to filter which models are shown. */
  lensOutputKind?: 'text' | 'image' | 'video' | 'audio' | 'music' | null
  /** Lens version id for execution pinning and file uploads. */
  versionId?: string
  /** True while version params are still loading (prevents freeform fallback flash). */
  isLoadingVersionParams?: boolean
  /** Upload a file for a file-type param. Returns the media_object_id. */
  onFileParamUpload?: (key: string, file: File) => Promise<string>
  /** Append one file to a `files`-type param. Returns updated media_object_id list. */
  onFilesParamUpload?: (
    param: LensVersionParam,
    file: File,
    currentIds: string[],
    allValues: Record<string, unknown>,
    allParams: LensVersionParam[],
  ) => Promise<string[]>
  /** Remove one file from a `files`-type param. */
  onFilesParamRemove?: (
    param: LensVersionParam,
    objectId: string,
    currentIds: string[],
  ) => Promise<string[]>
  /** When true, the panel is shown as a blurred, non-interactive preview. */
  isLocked?: boolean
  /** Optional message shown while the panel is locked. */
  lockedTitle?: string
  lockedDescription?: string
  /** Called when the user clicks the sign-in button in the locked state. */
  onSignIn?: () => void
  /** Lens title forwarded into import templates so external AI has context when filling in values. */
  lensTitle?: string
  /** Lens description forwarded into import templates. */
  lensDescription?: string
  /** auth.uid() of the active lenser — enables the AI generation button in the parameters header. */
  profileId?: string
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
  localKeyAvailability?: LocalKeyAvailabilityReason
  onAddLocalKey?: (provider: string, label: string, rawKey: string) => Promise<void>
  onRemoveLocalKey?: (id: string) => Promise<void>
  onUpdateLocalKey?: (id: string, rawKey: string, label: string) => Promise<void>
  onPairGateway?: (token: string) => void
  onForgetGateway?: () => Promise<void>
  onRefreshLocalKeys?: () => Promise<void> | void
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
  lensOutputKind,
  versionId,
  isLoadingVersionParams,
  onFileParamUpload,
  onFilesParamUpload,
  onFilesParamRemove,
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
  localKeyAvailability,
  onAddLocalKey,
  onRemoveLocalKey,
  onUpdateLocalKey,
  onPairGateway,
  onForgetGateway,
  onRefreshLocalKeys,
  onProviderDropdownOpen,
  chainabitState,
  chainabitModels,
  onChainabitConnect,
  isLocked = false,
  lockedTitle = 'Run Lens',
  lockedDescription = 'Sign in or register with a Lenser profile to run this lens and manage executions.',
  onSignIn,
  lensTitle,
  lensDescription,
  profileId,
}) => {
  const form = useLabParamForm(lensContent, params, versionParams)

  // Modality selector — only shown when the model supports non-text output modalities
  const availableOutputModalities = selectedModelOutputModalities ?? ['text']
  const nonTextModalities = availableOutputModalities.filter((m) => m !== 'text')
  const hasMediaModalities = nonTextModalities.length > 0
  const [selectedModality, setSelectedModality] = useState<'text' | 'image' | 'video' | 'audio' | 'music'>(
    () => (lensOutputKind && lensOutputKind !== 'text') ? lensOutputKind : 'text'
  )

  // When the user picks a different model, snap the output selector to that
  // model's output kind so the modality never drifts out of sync with the model.
  React.useEffect(() => {
    if (!selectedModelKey) return
    const caps = getMediaCapabilities(selectedModelKey)
    if (caps.kind && caps.kind !== 'text') {
      setSelectedModality(caps.kind as 'image' | 'video' | 'audio' | 'music')
    }
  }, [selectedModelKey])

  const effectiveModality = hasMediaModalities ? selectedModality : 'text'

  // Media generation params (only used when effectiveModality !== 'text')
  const [mediaWidth, setMediaWidth] = useState(1024)
  const [mediaHeight, setMediaHeight] = useState(1024)
  const [mediaDurationS, setMediaDurationS] = useState(5)
  const [mediaAspectRatio, setMediaAspectRatio] = useState('16:9')
  // Extended image params
  const [mediaQuality, setMediaQuality] = useState<'standard' | 'hd'>('standard')
  const [mediaStyle, setMediaStyle] = useState('')
  const [mediaBatch, setMediaBatch] = useState(1)
  // Extended video params
  const [mediaFps, setMediaFps] = useState<number | ''>('')
  // Audio / TTS params
  const [mediaVoiceId, setMediaVoiceId] = useState('')
  const [mediaAudioSpeed, setMediaAudioSpeed] = useState<number | ''>('')
  const [mediaAudioFormat, setMediaAudioFormat] = useState<'mp3' | 'wav' | 'opus' | 'flac' | ''>('')
  // Shared advanced params
  const [mediaNegativePrompt, setMediaNegativePrompt] = useState('')
  const [mediaSeed, setMediaSeed] = useState<number | ''>('')

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
    const sharedAdvanced: Partial<GenerativeMediaParams> = {
      ...(mediaNegativePrompt.trim() ? { negative_prompt: mediaNegativePrompt.trim() } : {}),
      ...(mediaSeed !== '' ? { seed: Number(mediaSeed) } : {}),
    }

    if (effectiveModality === 'image') {
      // Only include width/height when the model accepts custom sizes (OpenAI image).
      // For models that key off aspectRatio (Imagen, Stability, fal) we send aspect_ratio.
      let sizeParams: Partial<GenerativeMediaParams> = {}
      if (mediaCapabilities.imageSizes.length > 0) {
        sizeParams = { width: mediaWidth, height: mediaHeight }
      } else if (mediaCapabilities.aspectRatios.length > 0) {
        const aspect = mediaCapabilities.aspectRatios.includes(mediaAspectRatio)
          ? mediaAspectRatio
          : mediaCapabilities.aspectRatios[0]
        sizeParams = { aspect_ratio: aspect }
      }
      return {
        ...base,
        ...sizeParams,
        ...(mediaCapabilities.imageQualities.length > 0 ? { quality: mediaQuality } : {}),
        ...(mediaCapabilities.supportsStyle && mediaStyle.trim() ? { style: mediaStyle.trim() } : {}),
        ...(mediaCapabilities.maxBatch > 1 && mediaBatch > 1 ? { n: mediaBatch } : {}),
        ...sharedAdvanced,
      }
    }

    if (effectiveModality === 'video') {
      const aspect = mediaCapabilities.aspectRatios.length === 0 || mediaCapabilities.aspectRatios.includes(mediaAspectRatio)
        ? mediaAspectRatio
        : mediaCapabilities.aspectRatios[0]
      const duration = mediaCapabilities.durations.length === 0 || mediaCapabilities.durations.includes(mediaDurationS)
        ? mediaDurationS
        : mediaCapabilities.durations[0]
      return {
        ...base,
        duration_s: duration,
        aspect_ratio: aspect,
        ...(mediaFps !== '' ? { fps: Number(mediaFps) } : {}),
        ...sharedAdvanced,
      }
    }

    if (effectiveModality === 'audio' || effectiveModality === 'music') {
      const duration = mediaCapabilities.durations.length === 0 || mediaCapabilities.durations.includes(mediaDurationS)
        ? mediaDurationS
        : mediaCapabilities.durations[0]
      return {
        ...base,
        duration_s: duration,
        ...(mediaVoiceId.trim() ? { voice_id: mediaVoiceId.trim() } : {}),
        ...(mediaAudioSpeed !== '' ? { speed: Number(mediaAudioSpeed) } : {}),
        ...(mediaAudioFormat ? { format: mediaAudioFormat } : {}),
      }
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
  const [copiedWithInternalIds, setCopiedWithInternalIds] = useState(false)

  const isNonEmpty = (v: unknown) => {
    if (v === undefined || v === null) return false
    if (typeof v === 'string') return v.trim().length > 0
    if (Array.isArray(v)) return v.length > 0
    return true
  }
  const canCopyWithParams = Object.values(form.inputValues).some(isNonEmpty)

  const renderCopyWithParameters = async (resolveFileUrls: boolean): Promise<string> => {
    if (form.effectiveParams.length === 0) return lensContent

    const snapshot = buildInputSnapshot(form.inputValues, form.effectiveParams)
    const snapshotForPrompt = resolveFileUrls
      ? await resolveLensFileParamsForCopy(snapshot, form.effectiveParams)
      : snapshot

    return renderTemplateWithSnapshot(lensContent, snapshotForPrompt, form.effectiveParams, {
      keepUnsetTokens: true,
    })
  }

  const handleCopyWithParameters = async () => {
    try {
      const rendered = await renderCopyWithParameters(true)
      await copyTextToClipboard(rendered)
      setCopiedWithParams(true)
      setTimeout(() => setCopiedWithParams(false), 2000)
    } catch {
      // clipboard failed — leave state unchanged
    }
  }

  const handleCopyWithInternalIds = async () => {
    try {
      const rendered = await renderCopyWithParameters(false)
      await copyTextToClipboard(rendered)
      setCopiedWithInternalIds(true)
      setTimeout(() => setCopiedWithInternalIds(false), 2000)
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
              versionId,
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
              localKeyAvailability={localKeyAvailability}
              onAddLocalKey={onAddLocalKey ?? (async () => { })}
              onRemoveLocalKey={onRemoveLocalKey}
              onUpdateLocalKey={onUpdateLocalKey}
              onPairGateway={onPairGateway}
              onForgetGateway={onForgetGateway}
              onRefreshLocalKeys={onRefreshLocalKeys}
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
            <div className="flex flex-col gap-2">
              {/* Size: width/height or aspect ratio */}
              {mediaCapabilities.imageSizes.length > 0 ? (
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
              ) : mediaCapabilities.aspectRatios.length > 0 ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Aspect ratio</span>
                  <select
                    value={mediaCapabilities.aspectRatios.includes(mediaAspectRatio) ? mediaAspectRatio : mediaCapabilities.aspectRatios[0]}
                    onChange={(e) => setMediaAspectRatio(e.target.value)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  >
                    {mediaCapabilities.aspectRatios.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {/* Quality */}
              {mediaCapabilities.imageQualities.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Quality</span>
                  <div className="flex gap-1.5">
                    {mediaCapabilities.imageQualities.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setMediaQuality(q as 'standard' | 'hd')}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${mediaQuality === q
                          ? 'bg-primary-yellow-500 text-greyscale-900'
                          : 'border border-surface-border bg-surface-raised text-greyscale-600 hover:border-primary-yellow-400 dark:text-greyscale-300'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Style */}
              {mediaCapabilities.supportsStyle && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Style <span className="text-greyscale-400">(optional)</span></span>
                  <input
                    type="text"
                    placeholder="e.g. vivid, natural"
                    value={mediaStyle}
                    onChange={(e) => setMediaStyle(e.target.value)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                  />
                </label>
              )}

              {/* Batch size */}
              {mediaCapabilities.maxBatch > 1 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Images (n)</span>
                  <input
                    type="number"
                    min={1} max={mediaCapabilities.maxBatch} step={1}
                    value={mediaBatch}
                    onChange={(e) => setMediaBatch(Math.min(mediaCapabilities.maxBatch, Math.max(1, Number(e.target.value))))}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  />
                </label>
              )}

              {/* Negative prompt */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">Negative prompt <span className="text-greyscale-400">(optional)</span></span>
                <input
                  type="text"
                  placeholder="What to avoid in the image"
                  value={mediaNegativePrompt}
                  onChange={(e) => setMediaNegativePrompt(e.target.value)}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                />
              </label>

              {/* Seed */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">Seed <span className="text-greyscale-400">(optional)</span></span>
                <input
                  type="number"
                  min={0}
                  placeholder="Random"
                  value={mediaSeed}
                  onChange={(e) => setMediaSeed(e.target.value === '' ? '' : Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                />
              </label>
            </div>
          )}
          {effectiveModality === 'video' && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Duration (s)</span>
                  {mediaCapabilities.durations.length > 0 ? (
                    <select
                      value={mediaCapabilities.durations.includes(mediaDurationS) ? mediaDurationS : mediaCapabilities.durations[0]}
                      onChange={(e) => setMediaDurationS(Number(e.target.value))}
                      className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                    >
                      {mediaCapabilities.durations.map((d) => (
                        <option key={d} value={d}>{d}s</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="number"
                      min={1} max={60} step={1}
                      value={mediaDurationS}
                      onChange={(e) => setMediaDurationS(Number(e.target.value))}
                      className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                    />
                  )}
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Aspect ratio</span>
                  <select
                    value={mediaAspectRatio}
                    onChange={(e) => setMediaAspectRatio(e.target.value)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  >
                    {(mediaCapabilities.aspectRatios.length > 0
                      ? mediaCapabilities.aspectRatios
                      : ['16:9', '9:16', '1:1', '4:3', '3:4']
                    ).map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* FPS */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">FPS <span className="text-greyscale-400">(optional)</span></span>
                <input
                  type="number"
                  min={1} max={120} step={1}
                  placeholder="Default"
                  value={mediaFps}
                  onChange={(e) => setMediaFps(e.target.value === '' ? '' : Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                />
              </label>

              {/* Negative prompt */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">Negative prompt <span className="text-greyscale-400">(optional)</span></span>
                <input
                  type="text"
                  placeholder="What to avoid in the video"
                  value={mediaNegativePrompt}
                  onChange={(e) => setMediaNegativePrompt(e.target.value)}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                />
              </label>

              {/* Seed */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">Seed <span className="text-greyscale-400">(optional)</span></span>
                <input
                  type="number"
                  min={0}
                  placeholder="Random"
                  value={mediaSeed}
                  onChange={(e) => setMediaSeed(e.target.value === '' ? '' : Number(e.target.value))}
                  className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                />
              </label>
            </div>
          )}
          {(effectiveModality === 'audio' || effectiveModality === 'music') && (
            <div className="flex flex-col gap-2">
              {/* Duration */}
              <label className="flex flex-col gap-1">
                <span className="text-xs text-greyscale-500">Duration (s)</span>
                {mediaCapabilities.durations.length > 0 ? (
                  <select
                    value={mediaCapabilities.durations.includes(mediaDurationS) ? mediaDurationS : mediaCapabilities.durations[0]}
                    onChange={(e) => setMediaDurationS(Number(e.target.value))}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  >
                    {mediaCapabilities.durations.map((d) => (
                      <option key={d} value={d}>{d}s</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={1} max={300} step={1}
                    value={mediaDurationS}
                    onChange={(e) => setMediaDurationS(Number(e.target.value))}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  />
                )}
              </label>

              {/* Voice selection (audio only — e.g. ElevenLabs) */}
              {effectiveModality === 'audio' && mediaCapabilities.voices.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Voice</span>
                  <select
                    value={mediaVoiceId}
                    onChange={(e) => setMediaVoiceId(e.target.value)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  >
                    <option value="">Provider default</option>
                    {mediaCapabilities.voices.map((v) => (
                      <option key={v.id} value={v.id}>{v.label}</option>
                    ))}
                  </select>
                </label>
              )}

              {/* Custom voice ID input when no preset list is available */}
              {effectiveModality === 'audio' && mediaCapabilities.voices.length === 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Voice ID <span className="text-greyscale-400">(optional)</span></span>
                  <input
                    type="text"
                    placeholder="Provider voice identifier"
                    value={mediaVoiceId}
                    onChange={(e) => setMediaVoiceId(e.target.value)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                  />
                </label>
              )}

              {/* Speed (TTS) */}
              {effectiveModality === 'audio' && mediaCapabilities.supportsAudioSpeed && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">
                    Speed <span className="text-greyscale-400">(0.5 – 2.0, optional)</span>
                  </span>
                  <input
                    type="number"
                    min={0.5} max={2.0} step={0.1}
                    placeholder="1.0"
                    value={mediaAudioSpeed}
                    onChange={(e) => setMediaAudioSpeed(e.target.value === '' ? '' : Number(e.target.value))}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50 placeholder:text-greyscale-400"
                  />
                </label>
              )}

              {/* Output format */}
              {mediaCapabilities.audioFormats.length > 0 && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-greyscale-500">Format</span>
                  <select
                    value={mediaAudioFormat}
                    onChange={(e) => setMediaAudioFormat(e.target.value as typeof mediaAudioFormat)}
                    className="rounded-xl border border-surface-border bg-surface-raised px-3 py-1.5 text-sm text-greyscale-900 dark:text-greyscale-50"
                  >
                    <option value="">Provider default</option>
                    {mediaCapabilities.audioFormats.map((f) => (
                      <option key={f} value={f}>{f.toUpperCase()}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}

          </div>{/* end top fixed section */}

          {/* Parameters Header — Fixed above the scrollable area */}
          {form.effectiveParams.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-surface-raised dark:bg-surface-raised border-b border-surface-border shrink-0 z-10">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Parameters
              </span>
              <div className="flex items-center gap-1">
                {profileId && (
                  <GenerateWithAIButton
                    profileId={profileId}
                    generationType="lens_params"
                    context={{
                      params: form.effectiveParams.map((p) => ({
                        label: p.label,
                        type: p.tool.type,
                        ...(p.tool.options?.length ? { options: p.tool.options.map((o) => o.value) } : {}),
                      })),
                      lensTitle,
                      lensContent,
                    }}
                    onGenerated={(output) => {
                      if (output.type === 'lens_params') {
                        form.applyImportedValues(output.result)
                      }
                    }}
                  />
                )}
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
              onFilesUpload={
                onFilesParamUpload
                  ? async (param, file, currentIds) => {
                      const next = await onFilesParamUpload(
                        param,
                        file,
                        currentIds,
                        form.inputValues,
                        form.effectiveParams,
                      )
                      form.handleChange(param.label, next)
                      return next
                    }
                  : undefined
              }
              onFileRemove={
                onFilesParamRemove
                  ? async (param, objectId, currentIds) => {
                      const next = await onFilesParamRemove(param, objectId, currentIds)
                      form.handleChange(param.label, next)
                      return next
                    }
                  : undefined
              }
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
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCopyWithParameters}
                    disabled={isLocked}
                    title="Copy prompt with parameter values; file params use signed HTTPS URLs for external AI tools"
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
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCopyWithInternalIds}
                    disabled={isLocked}
                    title="Copy with media_object_id UUIDs for LenserFight execution (internal)"
                    className={`flex-shrink-0 flex items-center justify-center gap-2 h-auto py-2 px-3 rounded-xl border shadow-sm transition-all text-xs ${copiedWithInternalIds
                        ? 'bg-slate-600 border-slate-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 dark:bg-slate-900/30 dark:border-slate-700 dark:text-slate-200'
                      }`}
                  >
                    {copiedWithInternalIds ? (
                      <>
                        <Check size={14} strokeWidth={3} />
                        <span>Copied IDs</span>
                      </>
                    ) : (
                      <span>Internal IDs</span>
                    )}
                  </Button>
                </>
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
        lensTitle={lensTitle}
        lensDescription={lensDescription}
        lensContent={lensContent}
        profileId={profileId}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        versionParams={form.effectiveParams}
        onApply={form.applyImportedValues}
        currentValues={form.inputValues}
        lensTitle={lensTitle}
        lensDescription={lensDescription}
        lensContent={lensContent}
        profileId={profileId}
      />
    </div>
  )
}
