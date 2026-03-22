import React from 'react'
import { SelectField } from '@lenserfight/ui/forms'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest', icon: undefined },
  { value: 'popular', label: 'Popular', icon: undefined },
]

interface PromptsSortDropdownProps {
  value: 'newest' | 'popular'
  onChange: (val: 'newest' | 'popular') => void
}

export const PromptsSortDropdown: React.FC<PromptsSortDropdownProps> = ({ value, onChange }) => {
  return (
    <SelectField
      value={value}
      onChange={(val) => onChange(val as 'newest' | 'popular')}
      options={SORT_OPTIONS}
    />
  )
}
