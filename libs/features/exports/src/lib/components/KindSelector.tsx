import React from 'react'

import { SegmentedControl } from '@lenserfight/ui/components'

import type { ExportKind } from '@lenserfight/domain/exports'

export interface KindSelectorOption {
  kind: ExportKind
  label: string
}

export interface KindSelectorProps {
  value: ExportKind
  onChange: (kind: ExportKind) => void
  /** The kinds this entity can be exported as. Rendered in the given order. */
  options: KindSelectorOption[]
  disabled?: boolean
}

/**
 * Picks which shape an entity is exported as — e.g. a Lens exported either as
 * a Lens or as an agentskills.io Skill. Mirrors FormatSelector so the two
 * segmented controls in the export modal read as one system.
 */
export const KindSelector: React.FC<KindSelectorProps> = ({
  value,
  onChange,
  options,
  disabled,
}) => {
  return (
    <SegmentedControl<ExportKind>
      options={options.map((o) => ({
        value: o.kind,
        label: o.label,
        disabled: disabled,
      }))}
      value={value}
      onChange={onChange}
      size="sm"
      fullWidth
      aria-label="Export as"
    />
  )
}
