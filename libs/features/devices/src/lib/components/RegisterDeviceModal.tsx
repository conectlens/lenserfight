import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Modal } from '@lenserfight/ui/modals'
import { DrawerFooter } from '@lenserfight/ui/overlays'
import { CheckCircle2, Copy, Loader2 } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { useDevices } from '../hooks/useDevices'

interface Props {
  isOpen: boolean
  onClose: () => void
}

type Step = 'form' | 'command' | 'waiting'

export const RegisterDeviceModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { registerDevice, isRegistering, devices, refetch } = useDevices()
  const [step, setStep] = useState<Step>('form')
  const [deviceName, setDeviceName] = useState('')
  const [deviceType, setDeviceType] = useState<string>('laptop')
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Poll for trust_level change while on the waiting step
  useEffect(() => {
    if (step !== 'waiting' || !deviceId) return
    const interval = setInterval(() => {
      refetch()
    }, 3000)
    return () => clearInterval(interval)
  }, [step, deviceId, refetch])

  // Detect when device becomes approved
  useEffect(() => {
    if (step !== 'waiting' || !deviceId) return
    const device = devices.find((d) => d.id === deviceId)
    if (device && device.trustLevel !== 'pending') {
      clearTimeout(undefined)
      setStep('form')
      setDeviceName('')
      setDeviceId(null)
      onClose()
    }
  }, [devices, deviceId, step, onClose])

  const handleRegister = async () => {
    if (!deviceName.trim()) return
    try {
      const id = await registerDevice({ name: deviceName.trim(), deviceType })
      setDeviceId(id)
      setStep('command')
    } catch {
      // error surfaced via UI state
    }
  }

  const approveCommand = `lf gateway approve-device ${deviceId ?? '<device-id>'}`

  const handleCopy = () => {
    navigator.clipboard.writeText(approveCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 'form' ? 'Register Local Device' :
        step === 'command' ? 'Approve Device' :
        'Waiting for Approval…'
      }
      footer={
        step === 'form' ? (
          <DrawerFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleRegister} disabled={!deviceName.trim() || isRegistering}>
              {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Register
            </Button>
          </DrawerFooter>
        ) : step === 'command' ? (
          <DrawerFooter>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => setStep('waiting')}>I've run it</Button>
          </DrawerFooter>
        ) : null
      }
    >
      {step === 'form' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Device name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm bg-background"
              placeholder="e.g. MacBook Pro"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <SelectField
              label="Device type"
              value={deviceType}
              onChange={setDeviceType}
              options={[
                { value: 'laptop', label: 'Laptop' },
                { value: 'desktop', label: 'Desktop' },
                { value: 'server', label: 'Server' },
                { value: 'cloud', label: 'Cloud VM' },
                { value: 'other', label: 'Other' },
              ]}
            />
          </div>
        </div>
      )}

      {step === 'command' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Run this command on your local machine to approve this device:
          </p>
          <div className="flex items-center gap-2 bg-muted p-3 rounded-lg font-mono text-xs break-all">
            <span className="flex-1">{approveCommand}</span>
            <Button size="sm" variant="ghost" onClick={handleCopy}>
              {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      )}

      {step === 'waiting' && (
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground animate-pulse">
            Checking for approval…
          </p>
        </div>
      )}
    </Modal>
  )
}
