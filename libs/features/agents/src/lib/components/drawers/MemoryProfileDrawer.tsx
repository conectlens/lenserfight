import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentMemoryProfileRecord } from '@lenserfight/types'
import { Button } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

interface MemoryProfileDrawerProps {
  open: boolean
  onClose: () => void
  aiLenserId: string
  initial?: AgentMemoryProfileRecord | null
  onSaved?: (record: AgentMemoryProfileRecord) => void
}

const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }))

const SCOPE_OPTIONS = toOptions(['team', 'agent', 'workflow', 'global'])
const ISOLATION_OPTIONS = toOptions(['shared', 'isolated', 'sandboxed'])
const VISIBILITY_OPTIONS = toOptions(['private', 'team', 'public'])
const SUMMARY_OPTIONS = toOptions([
  'rolling_summary',
  'structured_facts',
  'no_summary',
])
const RESET_OPTIONS = toOptions(['manual', 'on_run', 'ttl'])

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
      title={isEdit ? 'Edit memory profile' : 'Add memory profile'}
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          isLoading={submitting}
          disabled={submitting}
        />
      }
    >
      <div className="space-y-4">
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/memory-profile"
          tip="Manage a long-lived knowledge slot. Pinned profiles load on every run; unpinned ones load only on explicit reference."
        />
        <Field label="Name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Scope">
          <SelectField value={scopeType} onChange={setScopeType} options={SCOPE_OPTIONS} />
        </Field>
        <Field label="Isolation">
          <SelectField
            value={isolationMode}
            onChange={setIsolationMode}
            options={ISOLATION_OPTIONS}
          />
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
          <SelectField
            value={visibility}
            onChange={setVisibility}
            options={VISIBILITY_OPTIONS}
          />
        </Field>
        <Field label="Summary strategy">
          <SelectField
            value={summaryStrategy}
            onChange={setSummaryStrategy}
            options={SUMMARY_OPTIONS}
          />
        </Field>
        <Field label="Reset policy">
          <SelectField
            value={resetPolicy}
            onChange={setResetPolicy}
            options={RESET_OPTIONS}
          />
        </Field>
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
