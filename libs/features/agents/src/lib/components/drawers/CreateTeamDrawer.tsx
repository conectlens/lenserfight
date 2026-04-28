import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'

interface CreateTeamDrawerProps {
  open: boolean
  onClose: () => void
  aiLenserId: string
  onCreated?: () => void
}

export const CreateTeamDrawer: React.FC<CreateTeamDrawerProps> = ({
  open,
  onClose,
  aiLenserId,
  onCreated,
}) => {
  const [name, setName] = useState('Executive Team')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName('Executive Team')
    setDescription('')
    setError(null)
  }, [open])

  const handleSave = async () => {
    if (!name.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await agentWorkspaceService.createTeam({
        ai_lenser_id: aiLenserId,
        agent_id: aiLenserId,
        name: name.trim(),
        description: description.trim() || null,
      })
      onCreated?.()
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Create failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Drawer open={open} onClose={onClose} side="right" width="w-[480px]" title="Create team">
      <div className="space-y-4">
        <Field label="Team name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Executive Team"
            className={inputClass}
          />
        </Field>
        <Field label="Description">
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Primary autonomous team for this workspace."
            className={inputClass}
          />
        </Field>
        {error && <ErrorBanner message={error} />}
        <DrawerFooter onCancel={onClose} onSave={handleSave} saving={submitting} label="Create team" />
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

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
    {message}
  </p>
)

const DrawerFooter: React.FC<{
  onCancel: () => void
  onSave: () => void
  saving: boolean
  label: string
}> = ({ onCancel, onSave, saving, label }) => (
  <div className="flex justify-end gap-2 pt-2">
    <button
      type="button"
      onClick={onCancel}
      className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-200"
    >
      Cancel
    </button>
    <button
      type="button"
      onClick={onSave}
      disabled={saving}
      className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
    >
      {saving ? 'Saving…' : label}
    </button>
  </div>
)
