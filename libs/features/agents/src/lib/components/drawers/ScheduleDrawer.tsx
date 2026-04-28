import {
  workflowsService,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { WorkflowScheduleRecord } from '@lenserfight/types'
import React, { useEffect, useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  workflows: WorkflowRecord[]
  initial?: WorkflowScheduleRecord | null
  /** Default assignee target — typically the active ai_lenser_id */
  defaultAssigneeId?: string | null
  onSaved?: () => void
}

export const ScheduleDrawer: React.FC<Props> = ({
  open,
  onClose,
  workflows,
  initial,
  defaultAssigneeId,
  onSaved,
}) => {
  const isEdit = !!initial
  const [workflowId, setWorkflowId] = useState(
    initial?.workflow_id ?? workflows[0]?.id ?? ''
  )
  const [cron, setCron] = useState(initial?.cron_expr ?? '0 9 * * 1')
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC')
  const [assigneeType, setAssigneeType] = useState<'agent' | 'team'>(
    (initial?.assignee_type as 'agent' | 'team') ?? 'agent'
  )
  const [assigneeId, setAssigneeId] = useState(
    initial?.assignee_id ?? defaultAssigneeId ?? ''
  )
  const [active, setActive] = useState(initial?.is_active ?? true)
  const [inputsJson, setInputsJson] = useState(
    JSON.stringify(initial?.inputs_template ?? {}, null, 2)
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setWorkflowId(initial?.workflow_id ?? workflows[0]?.id ?? '')
    setCron(initial?.cron_expr ?? '0 9 * * 1')
    setTimezone(initial?.timezone ?? 'UTC')
    setAssigneeType((initial?.assignee_type as 'agent' | 'team') ?? 'agent')
    setAssigneeId(initial?.assignee_id ?? defaultAssigneeId ?? '')
    setActive(initial?.is_active ?? true)
    setInputsJson(JSON.stringify(initial?.inputs_template ?? {}, null, 2))
    setError(null)
  }, [open, initial, defaultAssigneeId, workflows])

  const handleSave = async () => {
    setSubmitting(true)
    setError(null)
    try {
      let parsedInputs: Record<string, unknown> = {}
      try {
        parsedInputs = JSON.parse(inputsJson || '{}')
      } catch {
        throw new Error('Inputs template must be valid JSON object')
      }
      await workflowsService.upsertSchedule({
        workflow_id: workflowId,
        schedule_id: initial?.id ?? null,
        cron_expr: cron,
        timezone,
        is_active: active,
        assignee_type: assigneeType,
        assignee_id: assigneeId || null,
        inputs_template: parsedInputs,
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
      width="w-[560px]"
      title={isEdit ? 'Edit schedule' : 'Create schedule'}
    >
      <div className="space-y-4">
        <Field label="Workflow">
          <select
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            className={inputClass}
          >
            {workflows.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CRON expression">
            <input
              value={cron}
              onChange={(e) => setCron(e.target.value)}
              placeholder="0 9 * * 1"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Timezone (IANA)">
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="UTC"
              className={inputClass}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee type">
            <select
              value={assigneeType}
              onChange={(e) =>
                setAssigneeType(e.target.value as 'agent' | 'team')
              }
              className={inputClass}
            >
              <option value="agent">agent</option>
              <option value="team">team</option>
            </select>
          </Field>
          <Field label="Assignee ID">
            <input
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              placeholder="ai_lensers.id or teams.id"
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Inputs template (JSON)">
          <textarea
            rows={4}
            value={inputsJson}
            onChange={(e) => setInputsJson(e.target.value)}
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </Field>
        <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span>Active</span>
        </label>
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
            disabled={submitting || !workflowId}
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
