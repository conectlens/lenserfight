import React from 'react'

import { SegmentedControl } from '@lenserfight/ui/components'

import type { RuntimeMode } from '../runtime/detectRuntime'
import type { TransportId } from '../transport/ExportTransport'

/**
 * Renders only the destinations the current runtime supports.
 *
 * - cloud:              cloud-download only
 * - localhost-browser:  cloud-download + local-download
 * - localhost-desktop:  cloud-download + local-download + local-workspace
 *
 * GRASP: Information Expert. The component owns "which destinations
 * are visible right now" so the caller doesn't have to repeat the
 * matrix.
 */
export interface DestinationSelectorProps {
  mode: RuntimeMode
  value: TransportId
  onChange: (id: TransportId) => void
  disabled?: boolean
}

const OPTIONS: { value: TransportId; label: string; modes: RuntimeMode[] }[] = [
  {
    value: 'cloud-download',
    label: 'Cloud',
    modes: ['cloud', 'localhost-browser', 'localhost-desktop'],
  },
  {
    value: 'local-download',
    label: 'Device',
    modes: ['localhost-browser', 'localhost-desktop'],
  },
  {
    value: 'local-workspace',
    label: 'Workspace',
    modes: ['localhost-desktop'],
  },
]

export const DestinationSelector: React.FC<DestinationSelectorProps> = ({
  mode,
  value,
  onChange,
  disabled,
}) => {
  const visible = OPTIONS.filter((o) => o.modes.includes(mode))
  return (
    <SegmentedControl<TransportId>
      options={visible.map((o) => ({
        value: o.value,
        label: o.label,
        disabled: disabled,
      }))}
      value={value}
      onChange={onChange}
      size="sm"
      fullWidth
      aria-label="Export destination"
    />
  )
}
