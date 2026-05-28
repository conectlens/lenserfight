import { SelectField } from '@lenserfight/ui/forms'
import React from 'react'

import { useAIModels } from '../hooks/useAIModels'

interface AIModelSelectProps {
  value: string
  onChange: (modelKey: string) => void
  label?: string
  disabled?: boolean
  required?: boolean
  placeholder?: string
}

export const AIModelSelect: React.FC<AIModelSelectProps> = ({
  value,
  onChange,
  label,
  disabled,
  required,
  placeholder,
}) => {
  const { models, isLoading } = useAIModels()

  const options = models
    .filter((m) => !!m.key && m.is_active)
    .map((m) => ({
      value: m.key,
      label: `${m.name} (${m.providerDisplayName ?? m.provider})`,
    }))

  return (
    <SelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={isLoading ? 'Loading models…' : (placeholder ?? 'Select a model')}
      disabled={disabled || isLoading}
      required={required}
    />
  )
}
