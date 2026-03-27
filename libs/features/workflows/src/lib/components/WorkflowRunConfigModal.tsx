import { Dialog, ModalFooter } from '@lenserfight/ui/overlays'
import { Play } from 'lucide-react'
import React, { useState } from 'react'

import { useAIModels } from '@lenserfight/features/generations'
import { SelectField } from '@lenserfight/ui/forms'

interface WorkflowRunConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onRun: (globalModelId: string, inputs: Record<string, unknown>) => void
  isRunning: boolean
}

export function WorkflowRunConfigModal({ isOpen, onClose, onRun, isRunning }: WorkflowRunConfigModalProps) {
  const [globalModelId, setGlobalModelId] = useState('')
  const { models, isLoading } = useAIModels()

  const modelOptions = models
    .filter((m) => !!m.key && m.is_active)
    .map((m) => ({ value: m.key, label: `${m.name} (${m.provider})` }))

  const handleRun = () => {
    if (!globalModelId) return
    onRun(globalModelId, {})
    onClose()
  }

  return (
    <Dialog open={isOpen} onClose={onClose} title="Run Workflow" maxWidth="max-w-sm">
      <div className="space-y-5">
        <div className="space-y-1.5">
          <SelectField
            label="Global AI Model"
            value={globalModelId}
            onChange={setGlobalModelId}
            options={modelOptions}
            placeholder={isLoading ? 'Loading models…' : 'Select a model'}
            disabled={isLoading}
            required
          />
          <p className="text-[11px] text-greyscale-400 leading-tight">
            Used for all nodes unless a node overrides it in its config.
          </p>
        </div>

        <ModalFooter
          leftButton={{ label: 'Cancel', onClick: onClose, disabled: isRunning, variant: 'secondary' }}
          primaryButton={{
            label: <span className="flex items-center gap-1.5"><Play size={12} /> Run Workflow</span>,
            onClick: handleRun,
            isLoading: isRunning,
            disabled: !globalModelId || isLoading,
            className: 'px-6',
          }}
        />
      </div>
    </Dialog>
  )
}
