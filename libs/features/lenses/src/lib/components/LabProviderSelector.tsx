import React, { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { SearchSelectField } from '@lenserfight/ui/forms'
import { AIProviderSelectList, AIModelSelectList } from '@lenserfight/features/generations'
import { AIProvider, AIProviderModel, FundingSource } from '@lenserfight/types'
import type { ChainabitAiModel } from '@lenserfight/types'
import type { OllamaModelInfo } from '../hooks/useOllamaModels'

interface LabProviderSelectorProps {
  fundingSource: FundingSource | undefined
  effectiveProviderKey: string
  providers: AIProvider[]
  isLoadingProviders: boolean
  providerModels: AIProviderModel[]
  isLoadingModels: boolean
  selectedProviderKey: string
  selectedModelKey: string
  onProviderChange: (key: string) => void
  onModelChange: (key: string) => void
  onProviderDropdownOpen?: () => void
  isOllamaLocal: boolean
  ollamaIsRunning: boolean | null
  isLoadingOllama: boolean
  ollamaModels: OllamaModelInfo[]
  ollamaError: string | null
  refetchOllama: () => void
  chainabitModels?: ChainabitAiModel[] | null
  chainabitConnected?: boolean
}

function ChainabitModelPicker({
  models,
  selectedModelKey,
  onModelChange,
}: {
  models: ChainabitAiModel[]
  selectedModelKey: string
  onModelChange: (key: string) => void
}) {
  const active = models.filter((m) => m.active)
  const providerKeys = [...new Set(active.map((m) => m.provider))]
  const providerOptions = providerKeys.map((key) => ({
    value: key,
    label: active.find((m) => m.provider === key)?.providerDisplayName ?? key,
  }))
  const selectedProvider = active.find((m) => m.modelKey === selectedModelKey)?.provider ?? providerKeys[0] ?? ''
  const modelsForProvider = active.filter((m) => m.provider === selectedProvider)

  useEffect(() => {
    if (!selectedModelKey && modelsForProvider.length > 0) {
      onModelChange(modelsForProvider[0].modelKey)
    }
  }, [selectedModelKey, selectedProvider]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <SearchSelectField
        value={selectedProvider}
        onChange={(p) => {
          const first = active.find((m) => m.provider === p)
          if (first) onModelChange(first.modelKey)
        }}
        placeholder="Select Chainabit provider…"
        options={providerOptions}
      />
      {modelsForProvider.length > 0 && (
        <SearchSelectField
          value={selectedModelKey}
          onChange={onModelChange}
          placeholder="Select model (optional)…"
          options={modelsForProvider.map((m) => ({ value: m.modelKey, label: m.name }))}
        />
      )}
    </>
  )
}

export const LabProviderSelector: React.FC<LabProviderSelectorProps> = ({
  fundingSource,
  effectiveProviderKey,
  providers,
  isLoadingProviders,
  providerModels,
  isLoadingModels,
  selectedProviderKey,
  selectedModelKey,
  onProviderChange,
  onModelChange,
  onProviderDropdownOpen,
  isOllamaLocal,
  ollamaIsRunning,
  isLoadingOllama,
  ollamaModels,
  ollamaError,
  refetchOllama,
  chainabitModels,
  chainabitConnected,
}) => {
  const isCloudByok = fundingSource === 'user_byok_cloud'
  const isLocalByok = fundingSource === 'user_byok_local'
  const isPlatformCredit = fundingSource === 'platform_credit'
  const hasChainabitModels = chainabitConnected && chainabitModels && chainabitModels.length > 0

  return (
    <>
      {/* Cloud BYOK: provider locked to key — show only model picker */}
      {isCloudByok && !!effectiveProviderKey && (
        <AIModelSelectList
          models={providerModels}
          isLoading={isLoadingModels}
          value={selectedModelKey}
          onChange={onModelChange}
          providerSelected={true}
        />
      )}

      {/* Platform credit + Chainabit connected: Chainabit provider + model picker */}
      {isPlatformCredit && hasChainabitModels && (
        <ChainabitModelPicker
          models={chainabitModels!}
          selectedModelKey={selectedModelKey}
          onModelChange={onModelChange}
        />
      )}

      {/* Platform credit + Chainabit connected but models still loading */}
      {isPlatformCredit && !hasChainabitModels && chainabitConnected && (
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-1">
          <Loader2 size={12} className="animate-spin" />
          Loading Chainabit models…
        </div>
      )}

      {/* Platform credit + no Chainabit connection: generic provider + model pickers */}
      {isPlatformCredit && !hasChainabitModels && !chainabitConnected && (
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

      {/* Legacy: non-BYOK, non-platform-credit (fallback for undefined fundingSource) */}
      {!isCloudByok && !isLocalByok && !isPlatformCredit && (
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
    </>
  )
}
