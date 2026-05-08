import React, { useState, useEffect } from 'react'
import { CheckCircle2, Copy, Loader2 } from 'lucide-react'
import { Button } from '@lenserfight/ui/components'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-semibold">
          {step === 'form' && 'Register Local Device'}
          {step === 'command' && 'Approve Device'}
          {step === 'waiting' && 'Waiting for Approval…'}
        </h2>

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
              <label className="text-sm font-medium">Device type</label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value)}
              >
                <option value="laptop">Laptop</option>
                <option value="desktop">Desktop</option>
                <option value="server">Server</option>
                <option value="cloud">Cloud VM</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleRegister} disabled={!deviceName.trim() || isRegistering}>
                {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Register
              </Button>
            </div>
          </div>
        )}

        {step === 'command' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Run this command on your local machine to approve the device:
            </p>
            <div className="flex items-center gap-2 bg-muted rounded px-3 py-2 font-mono text-xs">
              <span className="flex-1 break-all">{approveCommand}</span>
              <button onClick={handleCopy} className="shrink-0 text-muted-foreground hover:text-foreground">
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={() => setStep('waiting')}>I've run it</Button>
            </div>
          </div>
        )}

        {step === 'waiting' && (
          <div className="space-y-4 text-center py-4">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Waiting for device approval… checking every 3 seconds.
            </p>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        )}
      </div>
    </div>
  )
}
