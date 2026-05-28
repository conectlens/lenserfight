import React from 'react'
import { SearchSelectField } from '@lenserfight/ui/forms'
import { AIProviderModel } from '@lenserfight/types'

interface AIModelSelectListProps {
  models: AIProviderModel[]
  isLoading: boolean
  value: string
  onChange: (key: string) => void
  providerSelected: boolean
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
}

export const AIModelSelectList: React.FC<AIModelSelectListProps> = ({
  models,
  isLoading,
  value,
  onChange,
  providerSelected,
  disabled,
  label,
  placeholder,
  className,
}) => {
  const options = models.map((m) => ({ value: m.key, label: m.name }))

  const derivedPlaceholder =
    placeholder ??
    (isLoading ? 'Loading models…' : !providerSelected ? 'Select a provider first' : 'Select a model')

  return (
    <SearchSelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={derivedPlaceholder}
      searchPlaceholder="Search models…"
      disabled={disabled || !providerSelected || isLoading}
      className={className}
    />
  )
}
