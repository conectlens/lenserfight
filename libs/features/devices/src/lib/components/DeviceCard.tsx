import React from 'react'
import { Monitor, Laptop, Server, Cloud, HelpCircle, Trash2 } from 'lucide-react'
import { Card, Button } from '@lenserfight/ui/components'
import { DeviceTrustIndicator } from '@lenserfight/ui/widgets'
import type { DeviceRecord, DeviceTrustLevel, DeviceType } from '@lenserfight/types'
import { timeAgo } from '@lenserfight/utils/date'

const DEVICE_ICONS: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor className="w-4 h-4" />,
  laptop: <Laptop className="w-4 h-4" />,
  server: <Server className="w-4 h-4" />,
  cloud: <Cloud className="w-4 h-4" />,
  other: <HelpCircle className="w-4 h-4" />,
}

interface Props {
  device: DeviceRecord
  onRevoke?: (id: string) => void
  isRevoking?: boolean
}

export const DeviceCard: React.FC<Props> = ({ device, onRevoke, isRevoking }) => {
  const canRevoke = !['revoked', 'blocked'].includes(device.trustLevel)

  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-muted-foreground shrink-0">{DEVICE_ICONS[device.deviceType]}</span>
          <span className="font-medium truncate">{device.name}</span>
        </div>
        <DeviceTrustIndicator trustLevel={device.trustLevel as DeviceTrustLevel} />
      </div>

      <div className="text-sm text-muted-foreground space-y-1">
        {device.os && <div>OS: {device.os} {device.arch ? `(${device.arch})` : ''}</div>}
        {device.cliVersion && <div>CLI: v{device.cliVersion}</div>}
        {device.runnerVersion && <div>Runner: v{device.runnerVersion}</div>}
        <div>Gateway: {device.gatewayStatus}</div>
        <div>Last seen: {device.lastSeenAt ? timeAgo(device.lastSeenAt) : 'never'}</div>
      </div>

      {canRevoke && onRevoke && (
        <div className="flex justify-end pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRevoke(device.id)}
            disabled={isRevoking}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Revoke
          </Button>
        </div>
      )}
    </Card>
  )
}
