import { AIProvider, AIProviderModel, LensParam, FundingSource, UserApiKey, WalletBalance, LensVersionParam } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { Loader2, Play, Square } from 'lucide-react'
import React, { useState } from 'react'

import { TriggerLabExecutionDTO } from '../hooks/useLabController'
import { useLabParamForm } from '../hooks/useLabParamForm'
import { useOllamaModels } from '../hooks/useOllamaModels'

import { CsvImportDialog } from './CsvImportDialog'
import { FreeformInput } from './FreeformInput'
import { FundingSourceToggle } from './FundingSourceToggle'
import { JsonImportDialog } from './JsonImportDialog'
import { LabProviderSelector } from './LabProviderSelector'
import { LegacyParamFields } from './LegacyParamFields'
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
  /** Version id to pin execution to (from useVersionExecution). Passed to TriggerLabExecutionDTO. */
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
  const form = useLabParamForm(lensContent, params, versionParams)

  const isLocalByok = fundingSource === 'user_byok_local'
  const isCloudByok = fundingSource === 'user_byok_cloud'

  const effectiveProviderKey = isCloudByok
    ? (availableKeys?.find((k) => k.id === selectedKeyRefId)?.providerKey ?? '')
    : isLocalByok
      ? (availableLocalKeys?.find((k) => k.id === selectedLocalKeyId)?.provider ?? '')
      : selectedProviderKey

  const isOllamaLocal = isLocalByok && effectiveProviderKey === 'ollama'

  const {
    isRunning: ollamaIsRunning,
    isLoading: isLoadingOllama,
    models: ollamaModels,
    error: ollamaError,
    refetch: refetchOllama,
  } = useOllamaModels(isOllamaLocal)

  const [jsonImportOpen, setJsonImportOpen] = useState(false)
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  const isDisabled =
    isTriggeringExecution ||
    isStreaming ||
    (isOllamaLocal && ollamaIsRunning === false) ||
    (isLocalByok
      ? !selectedLocalKeyId || !selectedModelKey
      : !effectiveProviderKey || !selectedModelKey)

  return (
    <>
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
          })
        }
        className="flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-base p-4"
      >
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">Run Lens</h4>
          {(isTriggeringExecution || isStreaming) && (
            <span className="flex items-center gap-1.5 text-xs text-greyscale-500 dark:text-greyscale-400">
              <Loader2 size={12} className="animate-spin" />
              {isConnecting ? 'Connecting…' : isStreaming ? 'Streaming…' : 'Running…'}
            </span>
          )}
        </div>

        {/* 1. Funding Source */}
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
            walletBalance={walletBalance}
            canUseBYOK={canUseBYOK ?? false}
          />
        )}

        {/* 2. Provider / Model selector */}
        <LabProviderSelector
          fundingSource={fundingSource}
          effectiveProviderKey={effectiveProviderKey}
          providers={providers}
          isLoadingProviders={isLoadingProviders}
          providerModels={providerModels}
          isLoadingModels={isLoadingModels}
          selectedProviderKey={selectedProviderKey}
          selectedModelKey={selectedModelKey}
          onProviderChange={onProviderChange}
          onModelChange={onModelChange}
          onProviderDropdownOpen={onProviderDropdownOpen}
          isOllamaLocal={isOllamaLocal}
          ollamaIsRunning={ollamaIsRunning}
          isLoadingOllama={isLoadingOllama}
          ollamaModels={ollamaModels}
          ollamaError={ollamaError}
          refetchOllama={refetchOllama}
        />

        {/* 3. Version Parameters */}
        {form.usingVersionParams && versionParams && (
          <VersionParamFields
            params={versionParams}
            values={form.inputValues}
            errors={form.fieldErrors}
            onChange={form.handleChange}
            onFileUpload={onFileParamUpload}
            selectedModelInputModalities={selectedModelInputModalities}
            onImportJson={() => setJsonImportOpen(true)}
            onImportCsv={() => setCsvImportOpen(true)}
          />
        )}

        {/* Legacy LensParam[] renderer */}
        {!form.usingVersionParams && form.legacyParamSchemas.length > 0 && (
          <LegacyParamFields
            params={form.legacyParamSchemas}
            values={form.inputValues}
            errors={form.fieldErrors}
            onChange={form.handleChange}
            onMultiselectToggle={form.handleMultiselectToggle}
            onImportJson={() => setJsonImportOpen(true)}
            onImportCsv={() => setCsvImportOpen(true)}
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
        {!form.usingVersionParams && !isLoadingVersionParams && form.legacyParamSchemas.length === 0 && (
          <FreeformInput
            value={(form.inputValues['freeform'] as string) ?? ''}
            onChange={(v) => form.handleChange('freeform', v)}
          />
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

      <JsonImportDialog
        open={jsonImportOpen}
        onClose={() => setJsonImportOpen(false)}
        versionParams={versionParams}
        legacyParams={form.legacyParamSchemas}
        onApply={form.applyImportedValues}
      />

      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        versionParams={versionParams}
        legacyParams={form.legacyParamSchemas}
        onApply={form.applyImportedValues}
      />
    </>
  )
}
