import React from 'react'
import { SelectField } from '@lenserfight/ui/forms'
import { useAIProviders, useAIModelsByProvider } from '../hooks/useAIProviderModels'

interface AIProviderModelSelectProps {
  providerKey: string
  modelKey: string
  onProviderChange: (key: string) => void
  onModelChange: (key: string) => void
}

export const AIProviderModelSelect: React.FC<AIProviderModelSelectProps> = ({
  providerKey,
  modelKey,
  onProviderChange,
  onModelChange,
}) => {
  const { data: providers = [], isLoading: isLoadingProviders } = useAIProviders()
  const { data: models = [], isLoading: isLoadingModels } = useAIModelsByProvider(providerKey || null)

  const providerOptions = providers.map((p) => ({ value: p.key, label: p.display_name }))
  const modelOptions = models.map((m) => ({ value: m.model_key, label: m.name }))

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <SelectField
        label="Provider"
        value={providerKey}
        onChange={onProviderChange}
        options={providerOptions}
        placeholder={isLoadingProviders ? 'Loading…' : 'Select provider'}
        disabled={isLoadingProviders}
        className="w-full sm:w-48"
      />
      <SelectField
        label="Model"
        value={modelKey}
        onChange={onModelChange}
        options={modelOptions}
        placeholder={isLoadingModels ? 'Loading…' : providerKey ? 'Select model' : 'Select a provider first'}
        disabled={!providerKey || isLoadingModels}
        className="w-full sm:w-64"
      />
    </div>
  )
}
