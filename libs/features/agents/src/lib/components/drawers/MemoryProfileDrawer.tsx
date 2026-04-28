import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { AgentMemoryProfileRecord } from '@lenserfight/types'
import React, { useEffect, useState } from 'react'

interface MemoryProfileDrawerProps {
  open: boolean
  onClose: () => void
  aiLenserId: string
  initial?: AgentMemoryProfileRecord | null
  onSaved?: (record: AgentMemoryProfileRecord) => void
}

const SCOPE_TYPES = ['team', 'agent', 'workflow', 'global']
const ISOLATION_MODES = ['shared', 'isolated', 'sandboxed']
const VISIBILITIES = ['private', 'team', 'public']
const SUMMARY_STRATEGIES = [
  'rolling_summary',
  'structured_facts',
  'no_summary',
]
const RESET_POLICIES = ['manual', 'on_run', 'ttl']

export const MemoryProfileDrawer: React.FC<MemoryProfileDrawerProps> = ({
  open,
  onClose,
  aiLenserId,
  initial,
  onSaved,
}) => {
  const isEdit = !!initial
  const [name, setName] = useState(initial?.name ?? 'Team Memory')
  const [scopeType, setScopeType] = useState(initial?.scope_type ?? 'team')
  const [isolationMode, setIsolationMode] = useState(
    initial?.isolation_mode ?? 'shared'
  )
  const [retentionDays, setRetentionDays] = useState(
    initial?.retention_days ?? 30
  )
  const [visibility, setVisibility] = useState(initial?.visibility ?? 'private')
  const [summaryStrategy, setSummaryStrategy] = useState(
    initial?.summary_strategy ?? 'rolling_summary'
  )
  const [resetPolicy, setResetPolicy] = useState(
    initial?.reset_policy ?? 'manual'
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setName(initial?.name ?? 'Team Memory')
    setScopeType(initial?.scope_type ?? 'team')
    setIsolationMode(initial?.isolation_mode ?? 'shared')
    setRetentionDays(initial?.retention_days ?? 30)
    setVisibility(initial?.visibility ?? 'private')
    setSummaryStrategy(initial?.summary_strategy ?? 'rolling_summary')
    setResetPolicy(initial?.reset_policy ?? 'manual')
    setError(null)
  }, [open, initial])

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let result: AgentMemoryProfileRecord | null
      if (isEdit && initial) {
        result = await agentWorkspaceService.updateMemoryProfile(initial.id, {
          name,
          scope_type: scopeType,
          isolation_mode: isolationMode,
          retention_days: retentionDays,
          visibility,
          summary_strategy: summaryStrategy,
          reset_policy: resetPolicy,
        })
      } else {
        result = await agentWorkspaceService.createMemoryProfile({
          ai_lenser_id: aiLenserId,
          name,
          scope_type: scopeType,
          isolation_mode: isolationMode,
          retention_days: retentionDays,
          visibility,
          summary_strategy: summaryStrategy,
          reset_policy: resetPolicy,
        })
      }
      if (result) onSaved?.(result)
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
      width="w-[520px]"
      title={isEdit ? 'Edit memory profile' : 'Create memory profile'}
    >
      <div className="space-y-4">
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Scope">
          <select
            value={scopeType}
            onChange={(e) => setScopeType(e.target.value)}
            className={inputClass}
          >
            {SCOPE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Isolation">
          <select
            value={isolationMode}
            onChange={(e) => setIsolationMode(e.target.value)}
            className={inputClass}
          >
            {ISOLATION_MODES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Retention (days)">
          <input
            type="number"
            min={1}
            value={retentionDays}
            onChange={(e) => setRetentionDays(Number(e.target.value))}
            className={inputClass}
          />
        </Field>
        <Field label="Visibility">
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
            className={inputClass}
          >
            {VISIBILITIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Summary strategy">
          <select
            value={summaryStrategy}
            onChange={(e) => setSummaryStrategy(e.target.value)}
            className={inputClass}
          >
            {SUMMARY_STRATEGIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reset policy">
          <select
            value={resetPolicy}
            onChange={(e) => setResetPolicy(e.target.value)}
            className={inputClass}
          >
            {RESET_POLICIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
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
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </button>
        </div>
      </div>
    </Drawer>
  )
}

const inputClass =
  'w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white'

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
