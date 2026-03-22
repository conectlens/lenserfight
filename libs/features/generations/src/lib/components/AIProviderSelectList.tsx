import React from 'react'
import { SearchSelectField } from '@lenserfight/ui/forms'
import { AIProvider } from '@lenserfight/types'

interface AIProviderSelectListProps {
  providers: AIProvider[]
  isLoading: boolean
  value: string
  onChange: (key: string) => void
  disabled?: boolean
  label?: string
  placeholder?: string
  className?: string
}

export const AIProviderSelectList: React.FC<AIProviderSelectListProps> = ({
  providers,
  isLoading,
  value,
  onChange,
  disabled,
  label,
  placeholder,
  className,
}) => {
  const options = providers.map((p) => ({ value: p.key, label: p.display_name }))

  return (
    <SearchSelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={isLoading ? 'Loading providers…' : (placeholder ?? 'Select a provider')}
      searchPlaceholder="Search providers…"
      disabled={disabled || isLoading}
      className={className}
    />
  )
}
