import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { DeviceTrustIndicator } from '@lenserfight/ui/widgets'
import { useDevices } from '../hooks/useDevices'
import { timeAgo } from '@lenserfight/utils/date'

export const DeviceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { devices, isLoading, revokeDevice, isRevoking } = useDevices()

  const device = devices.find((d) => d.id === id)

  const handleRevoke = async () => {
    if (!device || !id) return
    await revokeDevice(id)
    navigate('/account/devices')
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-48 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (!device) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center text-muted-foreground">
        Device not found.{' '}
        <Button variant="ghost" size="sm" onClick={() => navigate('/account/devices')}>
          Back to devices
        </Button>
      </div>
    )
  }

  const canRevoke = !['revoked', 'blocked'].includes(device.trustLevel)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/account/devices')}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Devices
        </Button>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{device.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{device.deviceType}</p>
        </div>
        <DeviceTrustIndicator trustLevel={device.trustLevel} />
      </div>

      <div className="border rounded-xl divide-y text-sm">
        <Row label="Trust Level" value={<DeviceTrustIndicator trustLevel={device.trustLevel} />} />
        <Row label="Gateway Status" value={device.gatewayStatus} />
        <Row label="Operating System" value={device.os ?? '—'} />
        <Row label="Architecture" value={device.arch ?? '—'} />
        <Row label="CLI Version" value={device.cliVersion ? `v${device.cliVersion}` : '—'} />
        <Row label="Runner Version" value={device.runnerVersion ? `v${device.runnerVersion}` : '—'} />
        <Row label="Last Seen" value={device.lastSeenAt ? timeAgo(device.lastSeenAt) : 'never'} />
        <Row label="Registered" value={timeAgo(device.createdAt)} />
        {device.revokedAt && <Row label="Revoked" value={timeAgo(device.revokedAt)} />}
      </div>

      {Object.keys(device.capabilities).length > 0 && (
        <div className="border rounded-xl p-4 space-y-2">
          <h2 className="font-medium text-sm">Capabilities</h2>
          <div className="text-sm text-muted-foreground space-y-1">
            {device.capabilities.cpuCores != null && <div>CPU cores: {device.capabilities.cpuCores}</div>}
            {device.capabilities.ramGb != null && <div>RAM: {device.capabilities.ramGb} GB</div>}
            {device.capabilities.gpuAvailable != null && <div>GPU: {device.capabilities.gpuAvailable ? 'yes' : 'no'}</div>}
            {device.capabilities.localModels?.length ? (
              <div>Local models: {device.capabilities.localModels.join(', ')}</div>
            ) : null}
          </div>
        </div>
      )}

      {canRevoke && (
        <div className="border border-destructive/30 rounded-xl p-4 space-y-3">
          <h2 className="font-medium text-sm text-destructive">Danger Zone</h2>
          <p className="text-xs text-muted-foreground">
            Revoking this device will immediately stop it from submitting battle results.
            This cannot be undone.
          </p>
          <Button
            variant="danger"
            size="sm"
            onClick={handleRevoke}
            disabled={isRevoking}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            Revoke Device
          </Button>
        </div>
      )}
    </div>
  )
}

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between px-4 py-3 gap-4">
    <span className="text-muted-foreground shrink-0">{label}</span>
    <span className="text-right">{value}</span>
  </div>
)
