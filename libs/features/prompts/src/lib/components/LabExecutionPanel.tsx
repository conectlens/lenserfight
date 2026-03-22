import React, { useMemo, useState } from 'react'
import { Loader2, Play, Square } from 'lucide-react'
import { SelectField } from '@lenserfight/ui/forms'
import { Button, FormError } from '@lenserfight/ui/components'
import { AIProvider, AIProviderModel, PromptParam, PromptVersion, FundingSource, UserApiKey, WalletBalance } from '@lenserfight/types'
import { validateParamValues } from '@lenserfight/utils/text'
import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { FundingSourceToggle } from './FundingSourceToggle'

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
  promptId: string
  promptContent: string
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
  params?: PromptParam[]
  // Version selector
  versions?: PromptVersion[]
  selectedVersionId?: string | null
  onVersionChange?: (versionId: string) => void
  isLoadingVersions?: boolean
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

export const LabExecutionPanel: React.FC<LabExecutionPanelProps> = ({
  promptId: _promptId,
  promptContent,
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
  versions,
  selectedVersionId,
  onVersionChange,
  isLoadingVersions,
  fundingSource,
  onFundingSourceChange,
  selectedKeyRefId,
  onKeyRefIdChange,
  availableKeys,
  walletBalance,
  canUseBYOK,
}) => {
  const variables = useMemo(() => extractVariables(promptContent), [promptContent])

  // Derive typed schema: use props.params when available, fall back to legacy string extraction
  const paramSchemas = useMemo<PromptParam[]>(() => {
    if (params && params.length > 0) return params
    return variables.map((v) => ({ name: v, type: 'string' as const, required: true, placeholder: `Enter ${v}…` }))
  }, [params, variables])

  const [inputValues, setInputValues] = useState<Record<string, any>>({})
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleChange = (name: string, value: any) => {
    setInputValues((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => { const next = { ...prev }; delete next[name]; return next })
  }

  const handleMultiselectToggle = (name: string, option: string) => {
    setInputValues((prev) => {
      const current: string[] = Array.isArray(prev[name]) ? prev[name] : []
      const next = current.includes(option) ? current.filter((v) => v !== option) : [...current, option]
      return { ...prev, [name]: next }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedProviderKey || !selectedModelKey) return

    if (paramSchemas.length > 0) {
      const errors = validateParamValues(inputValues, paramSchemas)
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
    }

    const inputSnapshot: Record<string, any> =
      paramSchemas.length > 0
        ? Object.fromEntries(paramSchemas.map((p) => [p.name, inputValues[p.name] ?? p.default ?? '']))
        : { freeform: inputValues['freeform'] ?? '' }

    onTriggerStream({
      providerKey: selectedProviderKey as 'openai' | 'anthropic' | 'google',
      modelKey: selectedModelKey,
      promptContent,
      inputSnapshot,
      params: paramSchemas,
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
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Run Prompt</h4>
        {(isTriggeringExecution || isStreaming) && (
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
            <Loader2 size={12} className="animate-spin" />
            {isConnecting ? 'Connecting…' : isStreaming ? 'Streaming…' : 'Running…'}
          </span>
        )}
      </div>

      {/* Version Selector — only shown when versions are available */}
      {versions && versions.length > 0 && (
        <SelectField
          value={selectedVersionId ?? ''}
          onChange={(val) => onVersionChange?.(val)}
          placeholder={isLoadingVersions ? 'Loading versions…' : 'Select a version'}
          options={versions.map((v) => ({
            value: v.id,
            label: `v${v.versionNumber}${v.changelog ? ` — ${v.changelog}` : ''}${v.status === 'draft' ? ' (draft)' : ''}`,
          }))}
          disabled={isLoadingVersions}
        />
      )}

      {/* Provider + Model Selectors */}
      <SelectField
        value={selectedProviderKey}
        onChange={onProviderChange}
        placeholder={isLoadingProviders ? 'Loading providers…' : 'Select a provider'}
        options={providers.map((p) => ({ value: p.key, label: p.display_name }))}
        disabled={isLoadingProviders}
      />
      <SelectField
        value={selectedModelKey}
        onChange={onModelChange}
        placeholder={isLoadingModels ? 'Loading models…' : selectedProviderKey ? 'Select a model' : 'Select a provider first'}
        options={providerModels.map((m) => ({ value: m.key, label: m.name }))}
        disabled={!selectedProviderKey || isLoadingModels}
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

      {/* Typed Parameter Inputs */}
      {paramSchemas.length > 0 ? (
        <div className="flex flex-col gap-3">
          {paramSchemas.map((param) => (
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
                  value={inputValues[param.name] ?? param.default ?? ''}
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
                  value={inputValues[param.name] ?? param.default ?? ''}
                  onChange={(val) => handleChange(param.name, val)}
                  placeholder={`Select ${param.name}…`}
                  options={param.options ?? []}
                />
              )}

              {param.type === 'multiselect' && param.options && (
                <div className="flex flex-wrap gap-2">
                  {param.options.map((opt) => {
                    const selected: string[] = Array.isArray(inputValues[param.name]) ? inputValues[param.name] : []
                    const isChecked = selected.includes(opt.value)
                    return (
                      <label key={opt.value} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
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
                  value={inputValues[param.name] ?? param.default ?? ''}
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
      ) : (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Input
          </label>
          <textarea
            value={inputValues['freeform'] ?? ''}
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
