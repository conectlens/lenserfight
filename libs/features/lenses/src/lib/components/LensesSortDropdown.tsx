import React from 'react'
import { SelectField } from '@lenserfight/ui/forms'

export type LensesSortOrder = 'newest' | 'popular' | 'mine'

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'popular', label: 'Popular' },
  { value: 'mine', label: 'My Lenses' },
]

interface LensesSortDropdownProps {
  value: LensesSortOrder
  onChange: (val: LensesSortOrder) => void
  isAuthenticated?: boolean
}

export const LensesSortDropdown: React.FC<LensesSortDropdownProps> = ({ value, onChange, isAuthenticated }) => {
  const options = isAuthenticated ? SORT_OPTIONS : SORT_OPTIONS.filter((o) => o.value !== 'mine')
  return (
    <SelectField
      value={value}
      onChange={(val) => onChange(val as LensesSortOrder)}
      options={options}
    />
  )
}
