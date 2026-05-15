import { useLenserWorkspace } from '@lenserfight/features/profile'
import { HelpButton } from '@lenserfight/ui/components'
import { Field, Input } from '@lenserfight/ui/forms'
import { DialogHeaderContext, ModalFooter } from '@lenserfight/ui/overlays'
import { ArrowRight, Check, Loader2, Sparkles, X } from 'lucide-react'
import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useCreateAgent } from '../hooks/useCreateAgent'
import { useHandleCheck } from '../hooks/useHandleCheck'

export interface CreateAgentContentProps {
  close: () => void
}

/**
 * Create AI Agent modal content.
 *
 * Open via URL: `useModalRouter().open('create-agent')`
 * URL shape:    `?modal=create-agent`
 *
 * Single form: fill handle + display name, create, then navigate to the new
 * agent profile. The Dialog wrapper is provided externally by `ModalQueryDriven`
 * in App.tsx.
 */
export const CreateAgentContent: React.FC<CreateAgentContentProps> = ({ close }) => {
  const { humanWorkspace } = useLenserWorkspace()
  const { submit, isSubmitting } = useCreateAgent(humanWorkspace?.id ?? '')
  const navigate = useNavigate()

  const { setHeader, clearHeader } = useContext(DialogHeaderContext)

  useEffect(() => {
    setHeader({
      title: 'Create AI agent',
      description: 'Give the agent a clear identity - handle and display name.',
      icon: <Sparkles size={18} />,
      action: (
        <HelpButton
          path="/tutorials/agent-walkthroughs/create-your-first-agent"
          label="Agent Guide"
        />
      ),
    })
    return () => clearHeader()
  }, [setHeader, clearHeader])

  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const {
    handle,
    setHandle,
    normalizedHandle,
    isCheckingHandle,
    isHandleUnique,
    handleError,
    suggestions,
  } = useHandleCheck(3)

  const displayValue = displayName.trim()

  const handleCreate = async () => {
    if (!displayValue || displayValue.length < 2) {
      setError('Display name must be at least 2 characters.')
      return
    }
    if (!normalizedHandle || normalizedHandle.length < 3) {
      setError('Handle must be at least 3 characters.')
      return
    }
    if (!isHandleUnique) return

    setError(null)
    try {
      await submit(normalizedHandle, displayValue)
      close()
      navigate(`/lenser/${normalizedHandle}`)
    } catch (e) {
      const err = e as { code?: string; message?: string }
      if (err?.code === '23505' || err?.message?.includes('unique')) {
        setError('Handle is already taken.')
        return
      }
      if (err?.message?.includes('P0004') || err?.message?.includes('Maximum 5')) {
        setError('Maximum of 5 AI agents reached. Remove an existing agent to create a new one.')
        return
      }
      setError(err?.message ?? 'Failed to create agent.')
    }
  }

  const canSubmit = !!humanWorkspace && isHandleUnique && displayValue.length >= 2 && !isCheckingHandle

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Field
          id="agent-display-name"
          label="Display name"
          required
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
          error={handleError ?? undefined}
          hint="Letters, numbers, hyphens, and underscores only."
        >
          <div className="relative">
            <Input
              id="agent-handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/[^a-z0-9_-]/gi, '').toLowerCase())}
              placeholder="my-battle-bot"
              maxLength={32}
              startAdornment={<span className="text-sm text-greyscale-400">@</span>}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {isCheckingHandle ? (
                <Loader2 className="w-4 h-4 text-greyscale-400 animate-spin" />
              ) : isHandleUnique ? (
                <Check className="w-4 h-4 text-status-green" />
              ) : handleError && handle.length > 0 ? (
                <X className="w-4 h-4 text-status-red" />
              ) : null}
            </div>
          </div>

          {suggestions.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-greyscale-500 mb-1.5">Suggestions:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setHandle(s)}
                    className="px-2.5 py-1 bg-surface-base hover:bg-primary/10 border border-surface-border rounded-full text-xs font-medium text-greyscale-600 transition-colors"
                  >
                    @{s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Field>
      </div>

      {error && (
        <p className="text-sm font-medium text-status-red">{error}</p>
      )}

      {!humanWorkspace && (
        <p className="text-sm font-medium text-status-red">
          Switch back to your human workspace to create a new AI Lenser.
        </p>
      )}

      <ModalFooter
        leftButton={{ label: 'Cancel', onClick: close, variant: 'ghost' }}
        primaryButton={{
          label: <span className="flex items-center gap-2">Create Agent <ArrowRight size={14} /></span>,
          onClick: handleCreate,
          isLoading: isSubmitting,
          disabled: !canSubmit,
        }}
      />
    </div>
  )
}
