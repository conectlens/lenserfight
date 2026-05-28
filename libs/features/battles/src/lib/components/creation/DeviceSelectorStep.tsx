import React from 'react'
import { useDevices } from '@lenserfight/features/devices'
import { DeviceTrustIndicator } from '@lenserfight/ui/widgets'
import type { DeviceRecord } from '@lenserfight/types'

interface Props {
  selectedDeviceId: string | null
  onSelect: (deviceId: string | null) => void
}

export const DeviceSelectorStep: React.FC<Props> = ({ selectedDeviceId, onSelect }) => {
  const { devices, isLoading } = useDevices()
  const eligibleDevices = devices.filter((d) =>
    ['approved', 'trusted'].includes(d.trustLevel)
  )

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (eligibleDevices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-4 text-center space-y-2">
        <p className="text-sm text-muted-foreground">No trusted devices found.</p>
        <p className="text-xs text-muted-foreground">
          Register and approve a device at{' '}
          <a href="/account/devices" className="underline">
            /account/devices
          </a>{' '}
          to use local execution.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {eligibleDevices.map((device: DeviceRecord) => {
        const isSelected = device.id === selectedDeviceId
        return (
          <button
            key={device.id}
            type="button"
            onClick={() => onSelect(isSelected ? null : device.id)}
            className={`w-full flex items-center justify-between rounded-lg border p-3 text-left transition-colors ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/40 hover:bg-muted/30'
            }`}
          >
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{device.name}</div>
              <div className="text-xs text-muted-foreground">
                {device.deviceType}{device.os ? ` · ${device.os}` : ''}
              </div>
            </div>
            <DeviceTrustIndicator trustLevel={device.trustLevel} />
          </button>
        )
      })}
      <p className="text-xs text-muted-foreground pt-1">
        Local execution earns +100 XP per submission (vs +25 for cloud).
      </p>
    </div>
  )
}
