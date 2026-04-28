import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { AgentModelProfileRecord } from '@lenserfight/types'
import React, { useEffect, useState } from 'react'

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
    <Drawer open={open} onClose={onClose} side="right" width="w-[480px]" title="Edit model binding">
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="font-semibold text-gray-900 dark:text-white">
            {profile.model_key ?? profile.model_id}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Provider: {profile.provider_key ?? 'unknown'} · Support: {profile.support_level}
          </p>
        </div>

        <Field label="Profile name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Temperature">
          <input
            type="number"
            min={0}
            max={2}
            step={0.05}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
            className={inputClass}
          />
        </Field>

        <Field label="Max tokens">
          <input
            type="number"
            min={256}
            max={200000}
            step={256}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
            className={inputClass}
          />
        </Field>

        <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-amber-500"
          />
          <label htmlFor="isDefault" className="text-sm text-gray-700 dark:text-gray-200">
            Set as default model for this workspace
          </label>
        </div>

        {error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={submitting}
            className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
