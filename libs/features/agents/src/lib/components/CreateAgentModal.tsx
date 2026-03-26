import { useLenser } from '@lenserfight/features/profile'
import { Button } from '@lenserfight/ui/components'
import { Field, Input } from '@lenserfight/ui/forms'
import { ArrowRight, CheckCircle, Sparkles } from 'lucide-react'
import React, { useState } from 'react'

import { useCreateAgent } from '../hooks/useCreateAgent'

export interface CreateAgentContentProps {
  close: () => void
}

/**
 * Create AI Agent modal content.
 *
 * Open via URL: `useModalRouter().open('create-agent')`
 * URL shape:    `?modal=create-agent`
 *
 * Single form: fill handle + display name, then confirm and create.
 * The Dialog wrapper is provided externally by `ModalQueryDriven` in App.tsx.
 */
export const CreateAgentContent: React.FC<CreateAgentContentProps> = ({ close }) => {
  const { lenser } = useLenser()
  const { submit, isSubmitting } = useCreateAgent(lenser?.id ?? '')

  const [handle, setHandle] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState(false)

  const normalizedHandle = handle.trim().toLowerCase()
  const displayValue = displayName.trim()

  const reset = () => {
    setHandle('')
    setDisplayName('')
    setError(null)
    setCreated(false)
  }

  const handleClose = () => {
    reset()
    close()
  }

  const handleCreate = async () => {
    if (!displayValue || displayValue.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    if (!normalizedHandle || normalizedHandle.length < 3) {
      setError('Handle must be at least 3 characters.')
      return
    }
    setError(null)
    try {
      await submit(normalizedHandle, displayValue)
      setCreated(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create agent.'
      setError(msg)
    }
  }

  if (created) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-status-green/10">
          <CheckCircle size={30} className="text-status-green" />
        </div>
        <div className="space-y-1">
          <p className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
            Your AI agent is ready.
          </p>
          <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
            You can now configure its policy, model bindings, and runtime permissions from the agent detail page.
          </p>
        </div>
        <Button onClick={handleClose} className="w-auto gap-2">
          <Sparkles size={14} />
          Done
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field
          id="agent-display-name"
          label="Display name"
          required
          error={error && displayValue.length < 2 ? error : undefined}
          hint="Shown across the app on cards, profiles, and management panels."
        >
          <Input
            id="agent-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="My Battle Bot"
            maxLength={64}
          />
        </Field>

        <Field
          id="agent-handle"
          label="Handle"
          required
          error={error && normalizedHandle.length < 3 ? error : undefined}
          hint="Letters, numbers, hyphens, and underscores only."
        >
          <Input
            id="agent-handle"
            value={handle}
            onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
            placeholder="my-battle-bot"
            maxLength={32}
            startAdornment={<span className="text-sm text-greyscale-400">@</span>}
          />
        </Field>
      </div>

      {error && (
        <p className="text-sm font-medium text-status-red">{error}</p>
      )}

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row">
        <Button variant="ghost" onClick={handleClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button onClick={handleCreate} isLoading={isSubmitting} className="w-full gap-2 sm:w-auto">
          Create Agent <ArrowRight size={14} />
        </Button>
      </div>
    </div>
  )
}
