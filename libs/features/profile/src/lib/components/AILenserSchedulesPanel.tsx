import { Button, EmptyState } from '@lenserfight/ui/components'
import { Field, Input, SelectField, Switch, TextArea } from '@lenserfight/ui/forms'
import { AlertCircle, Clock3, Trash2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AIModel, UpsertWorkflowScheduleInput, WorkflowScheduleRecord } from '@lenserfight/types'

interface AILenserSchedulesPanelProps {
  workflows: WorkflowRecord[]
  schedules: WorkflowScheduleRecord[]
  models: AIModel[]
  onSave: (input: UpsertWorkflowScheduleInput) => Promise<void>
  onDelete: (scheduleId: string) => Promise<void>
  isSaving?: boolean
  isDeleting?: boolean
}

const INITIAL_INPUTS = '{}'

function formatRunTime(iso: string | null): string {
  if (!iso) return 'Never'
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const AILenserSchedulesPanel: React.FC<AILenserSchedulesPanelProps> = ({
  workflows,
  schedules,
  models,
  onSave,
  onDelete,
  isSaving = false,
  isDeleting = false,
}) => {
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [workflowId, setWorkflowId] = useState(workflows[0]?.id ?? '')
  const [cronExpr, setCronExpr] = useState('0 * * * *')
  const [globalModelId, setGlobalModelId] = useState('')
  const [inputsTemplate, setInputsTemplate] = useState(INITIAL_INPUTS)
  const [isActive, setIsActive] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const workflowTitleById = useMemo(
    () =>
      workflows.reduce<Record<string, string>>((acc, workflow) => {
        acc[workflow.id] = workflow.title
        return acc
      }, {}),
    [workflows]
  )

  useEffect(() => {
    if (!workflowId && workflows[0]?.id) {
      setWorkflowId(workflows[0].id)
    }
  }, [workflowId, workflows])

  const resetForm = () => {
    setEditingScheduleId(null)
    setWorkflowId(workflows[0]?.id ?? '')
    setCronExpr('0 * * * *')
    setGlobalModelId('')
    setInputsTemplate(INITIAL_INPUTS)
    setIsActive(true)
    setError(null)
  }

  const startEdit = (schedule: WorkflowScheduleRecord) => {
    setEditingScheduleId(schedule.id)
    setWorkflowId(schedule.workflow_id)
    setCronExpr(schedule.cron_expr)
    setGlobalModelId(schedule.global_model_id ?? '')
    setInputsTemplate(JSON.stringify(schedule.inputs_template ?? {}, null, 2))
    setIsActive(schedule.is_active)
    setError(null)
  }

  const submit = async () => {
    setError(null)

    let parsedInputs: Record<string, unknown>

    try {
      parsedInputs = JSON.parse(inputsTemplate || '{}') as Record<string, unknown>
    } catch {
      setError('Inputs template must be valid JSON.')
      return
    }

    try {
      await onSave({
        workflow_id: workflowId,
        schedule_id: editingScheduleId,
        cron_expr: cronExpr,
        global_model_id: globalModelId || null,
        inputs_template: parsedInputs,
        is_active: isActive,
      })
      resetForm()
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Failed to save schedule.'
      setError(message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1 flex items-center gap-2">
          <Clock3 size={16} className="text-primary-yellow-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {editingScheduleId ? 'Edit automated execution' : 'Configure automated execution'}
          </h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          Schedules trigger linked workflows automatically at the defined cadence. This agent profile provides the execution policy context — it does not initiate execution.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <Field id="schedule-workflow" label="Workflow">
            <SelectField
              value={workflowId}
              onChange={setWorkflowId}
              options={workflows.map((workflow) => ({
                value: workflow.id,
                label: workflow.title,
              }))}
            />
          </Field>

          <Field id="schedule-model" label="Model override">
            <SelectField
              value={globalModelId}
              onChange={setGlobalModelId}
              options={[
                { value: '', label: 'Use workflow default' },
                ...models.map((model) => ({ value: model.id, label: model.name })),
              ]}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field id="schedule-cron" label="CRON expression" hint="Five-field CRON only. Example: 0 * * * *">
            <Input id="schedule-cron" value={cronExpr} onChange={(event) => setCronExpr(event.target.value)} />
          </Field>
        </div>

        <div className="mt-4">
          <Field
            id="schedule-inputs"
            label="Inputs template"
            hint="JSON payload injected into workflow_runs.context_inputs for scheduled executions."
          >
            <TextArea
              id="schedule-inputs"
              rows={8}
              value={inputsTemplate}
              onChange={(event) => setInputsTemplate(event.target.value)}
            />
          </Field>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 dark:bg-gray-900">
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enable immediately</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cycle validation and overlap protection still apply when active.
            </p>
          </div>
          <Switch checked={isActive} onChange={setIsActive} />
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={submit} disabled={isSaving || workflows.length === 0} className="w-auto">
            {isSaving ? 'Saving...' : editingScheduleId ? 'Update schedule' : 'Create schedule'}
          </Button>
          {editingScheduleId && (
            <Button variant="secondary" onClick={resetForm} className="w-auto">
              Cancel edit
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h3 className="font-semibold text-gray-900 dark:text-white">Linked schedules</h3>
        <span className="text-xs text-gray-400">({schedules.length})</span>
      </div>

      {schedules.length === 0 ? (
        <EmptyState icon={Clock3} title="No CRON schedules configured." />
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => (
            <div
              key={schedule.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {workflowTitleById[schedule.workflow_id] ?? schedule.workflow_title}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <code className="rounded bg-gray-100 px-2 py-0.5 text-xs font-mono dark:bg-gray-700">
                      {schedule.cron_expr}
                    </code>
                    <span className={`text-xs font-medium ${schedule.is_active ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                      {schedule.is_active ? '● Active' : '○ Paused'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>Last run: {formatRunTime(schedule.last_run_at)}</span>
                    {schedule.last_dispatch_status && (
                      <span className={
                        schedule.last_dispatch_status === 'dispatched' ? 'text-green-600 dark:text-green-400' :
                        schedule.last_dispatch_status === 'dispatch_failed' ? 'text-red-600 dark:text-red-400' :
                        'text-yellow-600 dark:text-yellow-400'
                      }>
                        {schedule.last_dispatch_status.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  {schedule.last_error_message && (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Last issue: {schedule.last_error_message}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => startEdit(schedule)} className="w-auto">
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(schedule.id)}
                    disabled={isDeleting}
                    className="w-auto text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
