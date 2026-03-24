import React, { useMemo, useState, useRef } from 'react'
import { Loader2, Play, Square, Upload, AlertCircle } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { Button, FormError } from '@lenserfight/ui/components'
import { AIProviderSelectList, AIModelSelectList } from '@lenserfight/features/generations'
import { AIProvider, AIProviderModel, LensParam, FundingSource, UserApiKey, WalletBalance, LensVersionParam } from '@lenserfight/types'
import { validateParamValues } from '@lenserfight/utils/text'
import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { FundingSourceToggle } from './FundingSourceToggle'
import { sanitizeStringInput, canModelAcceptFile, validateParamValue } from '../hooks/useAttachmentValidation'

const VARIABLE_REGEX = /\{\{(\w+)\}\}/g

function extractVariables(content: string): string[] {
  const matches = new Set<string>()
  let match: RegExpExecArray | null
  const re = new RegExp(VARIABLE_REGEX.source, VARIABLE_REGEX.flags)
  while ((match = re.exec(content)) !== null) {
    matches.add(match[1])
  }
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
}

const inputClass =
  'w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500'

function FileParamInput({
  param,
  modelInputModalities,
  onUpload,
  value,
  onChange,
  error,
}: {
  param: LensVersionParam
  modelInputModalities?: string[]
  onUpload?: (key: string, file: File) => Promise<string>
  value?: string
  onChange: (mediaObjectId: string) => void
  error?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const accept = param.allowedMimeTypes?.join(',') ?? undefined

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalError(null)

    // Validate against model modalities
    if (modelInputModalities && !canModelAcceptFile(file.type, modelInputModalities)) {
      setLocalError(
        `The selected model does not support ${file.type} files. Please choose a model that accepts this format.`
      )
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    if (!onUpload) {
      setLocalError('File upload handler not configured.')
      return
    }

    setUploading(true)
    try {
      const mediaObjectId = await onUpload(param.key, file)
      onChange(mediaObjectId)
    } catch (err) {
      setLocalError((err as Error).message ?? 'Upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const displayError = localError ?? error

  return (
    <div className="space-y-1">
      {modelInputModalities && modelInputModalities.length > 0 && !onUpload && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <AlertCircle size={12} />
          <span>File upload is not supported in this context.</span>
        </div>
      )}
      <div
        className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary-500 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <Upload size={14} className="text-gray-400 flex-shrink-0" />
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {uploading ? 'Uploading…' : value ? '✓ File attached' : 'Choose file'}
        </span>
        {accept && <span className="text-[10px] text-gray-400 ml-auto">{accept}</span>}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFile}
        disabled={uploading}
      />
      {displayError && (
        <div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
          <span>{displayError}</span>
        </div>
      )}
    </div>
  )
}

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
  onFileParamUpload,
  fundingSource,
  onFundingSourceChange,
  selectedKeyRefId,
  onKeyRefIdChange,
  availableKeys,
  walletBalance,
  canUseBYOK,
}) => {
  const variables = useMemo(() => extractVariables(lensContent), [lensContent])
  const usingVersionParams = !!(versionParams && versionParams.length > 0)

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
    if (!selectedProviderKey || !selectedModelKey) return

    let inputSnapshot: Record<string, unknown>
    const errors: Record<string, string> = {}

    if (usingVersionParams && versionParams) {
      // Validate each version param
      for (const p of versionParams) {
        const err = validateParamValue(inputValues[p.key], p, selectedModelInputModalities)
        if (err) errors[p.key] = err
      }
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      // Sanitize text-like values
      inputSnapshot = Object.fromEntries(
        versionParams.map((p) => {
          const val = inputValues[p.key] ?? p.defaultValue ?? ''
          const sanitized =
            p.type === 'text' || p.type === 'textarea' || p.type === 'url' || p.type === 'json'
              ? sanitize(val)
              : val
          return [p.key, sanitized]
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
      providerKey: selectedProviderKey as 'openai' | 'anthropic' | 'google',
      modelKey: selectedModelKey,
      lensContent,
      inputSnapshot: inputSnapshot as Record<string, string>,
      params: usingVersionParams ? undefined : legacyParamSchemas,
      fundingSource,
      byokKeyRefId: fundingSource === 'user_byok_cloud' ? selectedKeyRefId ?? undefined : undefined,
    })
  }

  const isDisabled = isTriggeringExecution || isStreaming || !selectedProviderKey || !selectedModelKey

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

      {/* Provider + Model Selectors */}
      <AIProviderSelectList
        providers={providers}
        isLoading={isLoadingProviders}
        value={selectedProviderKey}
        onChange={onProviderChange}
      />
      <AIModelSelectList
        models={providerModels}
        isLoading={isLoadingModels}
        value={selectedModelKey}
        onChange={onModelChange}
        providerSelected={!!selectedProviderKey}
      />

      {/* Funding Source Toggle */}
      {fundingSource && onFundingSourceChange && onKeyRefIdChange && (
        <FundingSourceToggle
          fundingSource={fundingSource}
          onFundingSourceChange={onFundingSourceChange}
          selectedKeyRefId={selectedKeyRefId ?? null}
          onKeyRefIdChange={onKeyRefIdChange}
          availableKeys={availableKeys ?? []}
          walletBalance={walletBalance}
          canUseBYOK={canUseBYOK ?? false}
        />
      )}

      {/* Version Parameters (new 13-type system) */}
      {usingVersionParams && versionParams && (
        <div className="flex flex-col gap-3">
          {versionParams.map((param) => {
            const val = inputValues[param.key]
            const err = fieldErrors[param.key]
            const label = param.label ?? param.key

            return (
              <div key={param.key} className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                  {label}
                  {param.required && <span className="text-red-500 ml-0.5">*</span>}
                  {param.helpText && (
                    <span className="ml-1 normal-case text-gray-400 font-normal">— {param.helpText}</span>
                  )}
                </label>

                {(param.type === 'text' || param.type === 'json') && (
                  <input
                    type="text"
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    placeholder={param.placeholder ?? `Enter ${label}…`}
                    className={inputClass}
                  />
                )}

                {param.type === 'textarea' && (
                  <textarea
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    placeholder={param.placeholder ?? `Enter ${label}…`}
                    rows={3}
                    className={`${inputClass} resize-none`}
                  />
                )}

                {(param.type === 'integer' || param.type === 'float' || param.type === 'decimal' || param.type === 'number') && (
                  <input
                    type="number"
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    placeholder={param.placeholder ?? `Enter ${label}…`}
                    min={param.min ?? undefined}
                    max={param.max ?? undefined}
                    step={param.type === 'integer' ? 1 : 'any'}
                    className={inputClass}
                  />
                )}

                {param.type === 'boolean' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!(val ?? (param.defaultValue === 'true'))}
                      onChange={(e) => handleChange(param.key, e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                  </label>
                )}

                {param.type === 'select' && (
                  <SelectField
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(v) => handleChange(param.key, v)}
                    placeholder={param.placeholder ?? `Select ${label}…`}
                    options={param.options ?? []}
                  />
                )}

                {param.type === 'url' && (
                  <input
                    type="url"
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    placeholder={param.placeholder ?? 'https://…'}
                    className={inputClass}
                  />
                )}

                {param.type === 'date' && (
                  <input
                    type="date"
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    className={inputClass}
                  />
                )}

                {param.type === 'datetime' && (
                  <input
                    type="datetime-local"
                    value={(val as string) ?? param.defaultValue ?? ''}
                    onChange={(e) => handleChange(param.key, e.target.value)}
                    className={inputClass}
                  />
                )}

                {param.type === 'file' && (
                  <FileParamInput
                    param={param}
                    modelInputModalities={selectedModelInputModalities}
                    onUpload={onFileParamUpload}
                    value={val as string | undefined}
                    onChange={(mediaObjectId) => handleChange(param.key, mediaObjectId)}
                    error={err}
                  />
                )}

                {param.type !== 'file' && err && <FormError message={err} />}
              </div>
            )
          })}
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

      {/* Freeform input (no params at all) */}
      {!usingVersionParams && legacyParamSchemas.length === 0 && (
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
