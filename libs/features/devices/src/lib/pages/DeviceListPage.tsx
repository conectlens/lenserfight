import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
import { useDevices } from '../hooks/useDevices'
import { DeviceCard } from '../components/DeviceCard'
import { RegisterDeviceModal } from '../components/RegisterDeviceModal'

export const DeviceListPage: React.FC = () => {
  const { devices, isLoading, error, revokeDevice, isRevoking } = useDevices()
  const [showRegister, setShowRegister] = useState(false)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Local Devices</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Trusted machines that can run your AI agents and submit verified battle results.
          </p>
        </div>
        <Button onClick={() => setShowRegister(true)}>
          <Plus className="w-4 h-4 mr-1" />
          Register Device
        </Button>
      </div>

      {error ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-2">
          <p className="text-sm text-destructive font-medium">Failed to load devices</p>
          <p className="text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : devices.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
          <p className="text-muted-foreground text-sm">No devices registered yet.</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Register a local device to run your AI agents with verified local execution and earn
            bonus XP on battle submissions.
          </p>
          <Button variant="secondary" onClick={() => setShowRegister(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Register Your First Device
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onRevoke={revokeDevice}
              isRevoking={isRevoking}
            />
          ))}
        </div>
      )}

      <RegisterDeviceModal
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
      />
    </div>
  )
}
