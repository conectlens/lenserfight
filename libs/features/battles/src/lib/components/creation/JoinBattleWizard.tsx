import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@lenserfight/ui/components'
import { supabase } from '@lenserfight/data/supabase'
import { Loader2 } from 'lucide-react'
import { DeviceSelectorStep } from './DeviceSelectorStep'

type ParticipantType = 'human' | 'agent' | 'team'
type ExecutionMode = 'cloud' | 'local' | 'manual'

interface Props {
  battleId: string
  battleSlug: string
  onClose?: () => void
}

export const JoinBattleWizard: React.FC<Props> = ({ battleId, battleSlug, onClose }) => {
  const navigate = useNavigate()
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [participantType, setParticipantType] = useState<ParticipantType>('human')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('cloud')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canProceedStep1 = !!participantType
  const canProceedStep2 = participantType === 'human' || true
  const canProceedStep3 = executionMode !== 'local' || !!selectedDeviceId

  const handleJoin = async () => {
    setIsJoining(true)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('fn_battles_join', {
        p_battle_id: battleId,
        p_agent_id: null,
        p_runner_mode: executionMode,
        p_device_id: selectedDeviceId,
      })
      if (rpcError) throw rpcError
      navigate(`/battles/${battleSlug}/result`)
      onClose?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join battle')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Participant Type */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Join as</h2>
          <div className="space-y-2">
            {(['human', 'agent', 'team'] as ParticipantType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setParticipantType(type)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  participantType === type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className="font-medium capitalize">{type === 'human' ? 'Human' : type === 'agent' ? 'AI Agent' : 'Agent Team'}</div>
                <div className="text-xs text-muted-foreground">
                  {type === 'human' && 'Submit your own answer to the battle prompt'}
                  {type === 'agent' && 'Use one of your AI agents to generate a submission'}
                  {type === 'team' && 'Use a coordinated agent team to tackle the battle'}
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 2: Execution Mode */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Execution mode</h2>
          <div className="space-y-2">
            {([
              { value: 'cloud', label: 'Cloud Runner', desc: 'Run on LenserFight cloud. +25 XP on submission.', xp: '+25 XP' },
              { value: 'local', label: 'Local Trusted Runner', desc: 'Run on your registered local device. +100 XP for verified execution.', xp: '+100 XP' },
              { value: 'manual', label: 'Manual Submission', desc: 'Submit text or a URL manually. +25 XP on submission.', xp: '+25 XP' },
            ] as { value: ExecutionMode; label: string; desc: string; xp: string }[]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setExecutionMode(opt.value)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  executionMode === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:bg-muted/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{opt.label}</span>
                  <span className={`text-xs font-medium ${opt.value === 'local' ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                    {opt.xp}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(executionMode === 'local' ? 3 : 4)}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 3: Device Selection (local only) */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Select local device</h2>
          <DeviceSelectorStep
            selectedDeviceId={selectedDeviceId}
            onSelect={setSelectedDeviceId}
          />
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={() => setStep(4)} disabled={!canProceedStep3}>Next</Button>
          </div>
        </div>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="font-semibold">Confirm</h2>
          <div className="rounded-lg border divide-y text-sm">
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Participant type</span>
              <span className="capitalize">{participantType}</span>
            </div>
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">Execution mode</span>
              <span className="capitalize">{executionMode}</span>
            </div>
            {selectedDeviceId && (
              <div className="flex justify-between px-3 py-2">
                <span className="text-muted-foreground">Device</span>
                <span className="font-mono text-xs">{selectedDeviceId.substring(0, 8)}…</span>
              </div>
            )}
            <div className="flex justify-between px-3 py-2">
              <span className="text-muted-foreground">XP on completion</span>
              <span className="text-emerald-600 font-medium">
                {executionMode === 'local' ? '+100 XP (verified)' : '+25 XP'}
              </span>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => setStep(executionMode === 'local' ? 3 : 2)}>Back</Button>
            <Button onClick={handleJoin} disabled={isJoining}>
              {isJoining && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              Join Battle
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
