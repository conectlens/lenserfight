import React, { useMemo, useState } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import { SelectField, SearchSelectField, ToolField } from '@lenserfight/ui/forms'
import { Button, FormError } from '@lenserfight/ui/components'
import { AIProviderSelectList, AIModelSelectList } from '@lenserfight/features/generations'
import { AIProvider, AIProviderModel, LensParam, FundingSource, UserApiKey, WalletBalance, LensVersionParam } from '@lenserfight/types'
import { validateParamValues } from '@lenserfight/utils/text'
import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { FundingSourceToggle } from './FundingSourceToggle'
import { sanitizeStringInput, validateParamValue } from '../hooks/useAttachmentValidation'
import { useOllamaModels } from '../hooks/useOllamaModels'
import type { LocalKeyMeta } from '@lenserfight/types'

// Detect variables from both {{legacy}} and [[modern]] template syntaxes
function extractVariables(content: string): string[] {
  const matches = new Set<string>()
  const re1 = /\{\{(\w+)\}\}/g
  const re2 = /\[\[(\w+)\]\]/g
  let match: RegExpExecArray | null
  while ((match = re1.exec(content)) !== null) matches.add(match[1])
  while ((match = re2.exec(content)) !== null) matches.add(match[1])
  return Array.from(matches)
}

interface LabExecutionPanelProps {
  lensId: string
  lensContent: string
  providers: AIProvider[]
  isLoadingProviders: boolean
  providerModels: AIProviderModel[]
  isLoadingModels: boolean
  selectedProviderKey: string
  selectedModelKey: string
  onProviderChange: (key: string) => void
  onModelChange: (key: string) => void
  onTrigger: (dto: TriggerLabExecutionDTO) => void
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
  /** Version id to pin execution to (from useVersionExecution). Passed to TriggerLabExecutionDTO. */
  activeVersionId?: string | null
  /** True while version params are still loading (prevents freeform fallback flash). */
  isLoadingVersionParams?: boolean
  /** Upload a file for a file-type param. Returns the media_object_id. */
  onFileParamUpload?: (key: string, file: File) => Promise<string>
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
  /** Called when the user first opens the provider dropdown — triggers lazy data fetch */
  onProviderDropdownOpen?: () => void
}

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  lensId: _lensId,
  lensContent,
  providers,
  isLoadingProviders,
  providerModels,
  isLoadingModels,
  selectedProviderKey,
  selectedModelKey,
  onProviderChange,
  onModelChange,
  onTrigger: _onTrigger,
  onTriggerStream,
  isTriggeringExecution,
  isStreaming,
  isConnecting,
  onStop,
  params,
  versionParams,
  selectedModelInputModalities,
  activeVersionId: _activeVersionId,
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
  onProviderDropdownOpen,
}) => {
  const variables = useMemo(() => extractVariables(lensContent), [lensContent])
  const usingVersionParams = !!(versionParams && versionParams.length > 0)

  const isCloudByok = fundingSource === 'user_byok_cloud'
  const isLocalByok = fundingSource === 'user_byok_local'

  // Derive the effective provider key based on funding mode:
  // - Cloud BYOK: locked to the selected key's provider (no manual picker)
  // - Local BYOK: read from the selected local key's provider field
  // - Wallet: user-selected via provider dropdown
  const effectiveProviderKey = isCloudByok
    ? (availableKeys?.find((k) => k.id === selectedKeyRefId)?.providerKey ?? '')
    : isLocalByok
      ? (availableLocalKeys?.find((k) => k.id === selectedLocalKeyId)?.provider ?? '')
      : selectedProviderKey

  const isOllamaLocal = isLocalByok && effectiveProviderKey === 'ollama'

  // Detect running Ollama instance and list installed models.
  // Hook is always called (no conditional); `enabled` gates all network requests.
  const {
    isRunning: ollamaIsRunning,
    isLoading: isLoadingOllama,
    models: ollamaModels,
    error: ollamaError,
    refetch: refetchOllama,
  } = useOllamaModels(isOllamaLocal)

  // Legacy LensParam[] fallback (when versionParams is absent)
  const legacyParamSchemas = useMemo<LensParam[]>(() => {
    if (usingVersionParams) return []
    if (params && params.length > 0) return params
    return variables.map((v) => ({ name: v, type: 'string' as const, required: true, placeholder: `Enter ${v}…` }))
  }, [usingVersionParams, params, variables])

  const [inputValues, setInputValues] = useState<Record<string, unknown>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: unknown) => {
    setInputValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  const handleMultiselectToggle = (name: string, option: string) => {
    setInputValues((prev) => {
      const current: string[] = Array.isArray(prev[name]) ? (prev[name] as string[]) : []
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
      return { ...prev, [name]: next }
    })
  }

  const sanitize = (val: unknown): string =>
    typeof val === 'string' ? sanitizeStringInput(val) : String(val ?? '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // For local BYOK: provider comes from the selected local key
    const effectiveProviderKey = isLocalByok
      ? (availableLocalKeys?.find((k) => k.id === selectedLocalKeyId)?.provider ?? '')
      : selectedProviderKey

    if (!effectiveProviderKey || !selectedModelKey) return

    let inputSnapshot: Record<string, unknown>
    const errors: Record<string, string> = {}

    if (usingVersionParams && versionParams) {
      for (const p of versionParams) {
        const err = validateParamValue(inputValues[p.label], p, selectedModelInputModalities)
        if (err) errors[p.label] = err
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      inputSnapshot = Object.fromEntries(
        versionParams.map((p) => {
          const val = inputValues[p.label] ?? ''
          const sanitized =
            p.tool.type === 'text' || p.tool.type === 'textarea' || p.tool.type === 'url' || p.tool.type === 'json'
              ? sanitize(val)
              : val
          return [p.label, sanitized]
        }),
      )
    } else {
      const validationErrors = validateParamValues(inputValues as Record<string, string>, legacyParamSchemas)
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors)
        return
      }
      inputSnapshot =
        legacyParamSchemas.length > 0
          ? Object.fromEntries(
              legacyParamSchemas.map((p) => [p.name, sanitize(inputValues[p.name] ?? p.default ?? '')]),
            )
          : { freeform: sanitize(inputValues['freeform'] ?? '') }
    }

    onTriggerStream({
      providerKey: effectiveProviderKey as 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama',
      modelKey: selectedModelKey,
      lensContent,
      inputSnapshot: inputSnapshot as Record<string, string>,
      params: usingVersionParams ? undefined : legacyParamSchemas,
      fundingSource,
      byokKeyRefId: fundingSource === 'user_byok_cloud' ? selectedKeyRefId ?? undefined : undefined,
      byokLocalKeyId: fundingSource === 'user_byok_local' ? selectedLocalKeyId ?? undefined : undefined,
    })
  }

  const isDisabled =
    isTriggeringExecution ||
    isStreaming ||
    (isOllamaLocal && ollamaIsRunning === false) ||
    (isLocalByok
      ? !selectedLocalKeyId || !selectedModelKey
      : !effectiveProviderKey || !selectedModelKey)

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Run Lens</h4>
        {(isTriggeringExecution || isStreaming) && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            {isConnecting ? 'Connecting…' : isStreaming ? 'Streaming…' : 'Running…'}
          </span>
        )}
      </div>

      {/* 1. Funding Source — FIRST */}
      {fundingSource && onFundingSourceChange && onKeyRefIdChange && (
        <FundingSourceToggle
          fundingSource={fundingSource}
          onFundingSourceChange={onFundingSourceChange}
          selectedKeyRefId={selectedKeyRefId ?? null}
          onKeyRefIdChange={onKeyRefIdChange}
          availableKeys={availableKeys ?? []}
          selectedLocalKeyId={selectedLocalKeyId ?? null}
          onLocalKeyIdChange={onLocalKeyIdChange ?? (() => {})}
          availableLocalKeys={availableLocalKeys ?? []}
          onAddLocalKey={onAddLocalKey ?? (async () => {})}
          onRemoveLocalKey={onRemoveLocalKey}
          walletBalance={walletBalance}
          canUseBYOK={canUseBYOK ?? false}
        />
      )}

      {/* 2. Cloud BYOK: provider locked to key — show only model picker */}
      {isCloudByok && !!effectiveProviderKey && (
        <AIModelSelectList
          models={providerModels}
          isLoading={isLoadingModels}
          value={selectedModelKey}
          onChange={onModelChange}
          providerSelected={true}
        />
      )}

      {/* Wallet (platform credit): provider picker + model picker with lazy load */}
      {!isCloudByok && !isLocalByok && (
        <>
          <AIProviderSelectList
            providers={providers}
            isLoading={isLoadingProviders}
            value={selectedProviderKey}
            onChange={onProviderChange}
            onOpen={onProviderDropdownOpen}
          />
          <AIModelSelectList
            models={providerModels}
            isLoading={isLoadingModels}
            value={selectedModelKey}
            onChange={onModelChange}
            providerSelected={!!selectedProviderKey}
          />
        </>
      )}

      {/* Local BYOK + Ollama: liveness status + installed model list */}
      {isOllamaLocal && (
        <>
          {ollamaIsRunning === false && (
            <div className="flex flex-col gap-2 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                Ollama is not running
              </p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                {ollamaError ?? 'Start it with: ollama serve'}
              </p>
              <button
                type="button"
                onClick={refetchOllama}
                className="self-start text-xs text-primary-600 dark:text-primary-400 hover:underline"
              >
                Retry connection
              </button>
            </div>
          )}
          {ollamaIsRunning === null && isLoadingOllama && (
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-2">
              <Loader2 size={12} className="animate-spin" />
              Detecting Ollama…
            </div>
          )}
          {ollamaIsRunning && (
            <SearchSelectField
              value={selectedModelKey}
              onChange={onModelChange}
              placeholder="Select installed model…"
              isLoading={isLoadingOllama}
              options={ollamaModels.map((m) => ({
                value: m.name,
                label: m.name + (m.details?.parameter_size ? ` (${m.details.parameter_size})` : ''),
              }))}
            />
          )}
        </>
      )}

      {/* Local BYOK + non-Ollama (e.g. local OpenAI key): model picker from platform */}
      {isLocalByok && !isOllamaLocal && !!effectiveProviderKey && (
        <AIModelSelectList
          models={providerModels}
          isLoading={isLoadingModels}
          value={selectedModelKey}
          onChange={onModelChange}
          providerSelected={true}
        />
      )}

      {/* 3. Version Parameters */}
      {usingVersionParams && versionParams && (
        <div className="flex flex-col gap-3">
          {versionParams.map((param) => (
            <ToolField
              key={param.label}
              param={param}
              value={inputValues[param.label]}
              onChange={(v) => handleChange(param.label, v)}
              onFileUpload={onFileParamUpload}
              error={fieldErrors[param.label]}
              modelInputModalities={selectedModelInputModalities}
            />
          ))}
        </div>
      )}

      {/* Legacy LensParam[] renderer */}
      {!usingVersionParams && legacyParamSchemas.length > 0 && (
        <div className="flex flex-col gap-3">
          {legacyParamSchemas.map((param) => (
            <div key={param.name} className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                {param.name}
                {param.required && <span className="text-red-500 ml-0.5">*</span>}
                {param.description && (
                  <span className="ml-1 normal-case text-gray-400 font-normal">— {param.description}</span>
                )}
              </label>

              {(param.type === 'string' || param.type === 'number') && (
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={(inputValues[param.name] as string) ?? param.default ?? ''}
                  onChange={(e) => handleChange(param.name, e.target.value)}
                  placeholder={param.placeholder ?? `Enter ${param.name}…`}
                  min={param.min}
                  max={param.max}
                  className={inputClass}
                />
              )}

              {param.type === 'boolean' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!inputValues[param.name]}
                    onChange={(e) => handleChange(param.name, e.target.checked)}
                    className="w-4 h-4 accent-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{param.name}</span>
                </label>
              )}

              {param.type === 'select' && (
                <SelectField
                  value={(inputValues[param.name] as string) ?? param.default ?? ''}
                  onChange={(val) => handleChange(param.name, val)}
                  placeholder={`Select ${param.name}…`}
                  options={param.options ?? []}
                />
              )}

              {param.type === 'multiselect' && param.options && (
                <div className="flex flex-wrap gap-2">
                  {param.options.map((opt) => {
                    const selected: string[] = Array.isArray(inputValues[param.name]) ? (inputValues[param.name] as string[]) : []
                    return (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selected.includes(opt.value)}
                          onChange={() => handleMultiselectToggle(param.name, opt.value)}
                          className="w-3.5 h-3.5 accent-primary"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              {param.type === 'array' && (
                <textarea
                  value={(inputValues[param.name] as string) ?? param.default ?? ''}
                  onChange={(e) => handleChange(param.name, e.target.value)}
                  placeholder={
                    param.arrayFormat === 'json'
                      ? '["item1", "item2"]'
                      : param.arrayFormat === 'newline'
                        ? 'item1\nitem2\nitem3'
                        : 'item1, item2, item3'
                  }
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              )}

              {fieldErrors[param.name] && <FormError message={fieldErrors[param.name]} />}
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton while version params resolve */}
      {!usingVersionParams && isLoadingVersionParams && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-3">
          <Loader2 size={12} className="animate-spin" />
          Loading parameters…
        </div>
      )}

      {/* Freeform input (no params at all) */}
      {!usingVersionParams && !isLoadingVersionParams && legacyParamSchemas.length === 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Input
          </label>
          <textarea
            value={(inputValues['freeform'] as string) ?? ''}
            onChange={(e) => handleChange('freeform', e.target.value)}
            placeholder="Enter additional context or instructions…"
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
      )}

      {isStreaming ? (
        <Button
          type="button"
          onClick={onStop}
          className="w-full flex items-center justify-center gap-2 h-auto py-2.5 bg-red-600 hover:bg-red-700 text-white"
        >
          <Square size={16} />
          <span>Stop</span>
        </Button>
      ) : (
        <Button
          type="submit"
          disabled={isDisabled}
          className="w-full flex items-center justify-center gap-2 h-auto py-2.5"
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
      )}
    </form>
  )
}
