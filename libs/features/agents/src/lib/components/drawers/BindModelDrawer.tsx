import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentModelProfileRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

interface BindModelDrawerProps {
  open: boolean
  onClose: () => void
  profile: AgentModelProfileRecord
  onSaved?: () => void
}

export const BindModelDrawer: React.FC<BindModelDrawerProps> = ({
  open,
  onClose,
  profile,
  onSaved,
}) => {
  const [name, setName] = useState(profile.name)
  const [isDefault, setIsDefault] = useState(profile.is_default)
  const [temperature, setTemperature] = useState(
    (profile.params?.temperature as number | undefined) ?? 0.4
  )
  const [maxTokens, setMaxTokens] = useState(
    (profile.params?.maxTokens as number | undefined) ?? 4096
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(profile.name)
    setIsDefault(profile.is_default)
    setTemperature((profile.params?.temperature as number | undefined) ?? 0.4)
    setMaxTokens((profile.params?.maxTokens as number | undefined) ?? 4096)
    setError(null)
  }, [open, profile])

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      await agentWorkspaceService.updateModelProfile(profile.id, {
        name: name.trim() || profile.name,
        is_default: isDefault,
        params: { temperature, maxTokens },
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Save failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      width="w-[480px]"
      title="Bind model profile"
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/bind-model"
          tip="Edit a model profile's display name and inference parameters. Exactly one profile is the workspace default — promoting a profile demotes the previous one automatically."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : 'Save changes'}
          isLoading={submitting}
          disabled={submitting}
        />
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-semibold text-gray-900 dark:text-white">
            {profile.model_key ?? profile.model_id}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Provider: {profile.provider_key ?? 'unknown'} · Support: {profile.support_level}
          </p>
        </div>

        <FieldLabel
          label="Profile name"
          tooltip="A human-readable label for this model binding. Example: 'Production — GPT-4o' or 'Fast draft — Haiku'. Used in pickers and run history."
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Temperature"
          tooltip="Sampling temperature (0.0 – 2.0). Lower values produce more deterministic outputs; higher values increase variety. Recommended: 0.2–0.7 for analytical tasks; 0.8–1.2 for creative work."
        >
          <input
            type="number"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Max tokens"
          tooltip="Upper bound on generated tokens per call. The provider bills per token — set conservatively for cost control. Most modern models support 128 000–200 000 tokens."
        >
          <input
            type="number"
            min={256}
            max={200000}
            step={256}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className={inputClass}
          />
        </FieldLabel>

        <Tooltip
          content="Exactly one model profile is the workspace default. New runs use the default unless the workflow explicitly overrides it. Checking this demotes the previous default."
          position="top"
          contentClassName="max-w-xs whitespace-normal text-left"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
            <input
              type="checkbox"
              id="isDefault"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-primary-yellow-500"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-200">
              Set as default model for this workspace
            </label>
          </div>
        </Tooltip>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-primary-yellow-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const FieldLabel: React.FC<{
  label: string
  tooltip?: string
  children: React.ReactNode
}> = ({ label, tooltip, children }) => (
  <div className="block">
    <div className="mb-1 flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
        {label}
      </span>
      {tooltip && (
        <Tooltip content={tooltip} position="top" contentClassName="max-w-xs whitespace-normal text-left">
          <HelpCircle
            size={12}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label={`${label} — help`}
          />
        </Tooltip>
      )}
    </div>
    {children}
  </div>
)
