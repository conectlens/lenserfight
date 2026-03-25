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
  /** Called when the user opens the dropdown — use to trigger lazy data fetching */
  onOpen?: () => void
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
  onOpen,
}) => {
  const options = providers.map((p) => ({ value: p.key, label: p.display_name }))

  return (
    <SearchSelectField
      label={label}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? 'Select a provider'}
      searchPlaceholder="Search providers…"
      isLoading={isLoading}
      disabled={disabled}
      className={className}
      onOpen={onOpen}
    />
  )
}
