import React from 'react'

import { SegmentedControl } from '@lenserfight/ui/components'

import { EXPORT_FORMATS, type ExportFormat } from '@lenserfight/domain/exports'

export interface FormatSelectorProps {
  value: ExportFormat
  onChange: (format: ExportFormat) => void
  /** Limit which formats are offered (e.g., EX-1 disables YAML). */
  available?: ExportFormat[]
  disabled?: boolean
}

const LABELS: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  yaml: 'YAML',
}

export const FormatSelector: React.FC<FormatSelectorProps> = ({
  value,
  onChange,
  available = EXPORT_FORMATS as ExportFormat[],
  disabled,
}) => {
  return (
    <SegmentedControl<ExportFormat>
      options={available.map((f) => ({
        value: f,
        label: LABELS[f],
        disabled: disabled,
      }))}
      value={value}
      onChange={onChange}
      size="sm"
      fullWidth
      aria-label="Export format"
    />
  )
}
