import { AlertCircle, Clock3, Trash2 } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AIModel, UpsertWorkflowScheduleInput, WorkflowScheduleRecord } from '@lenserfight/types'
import { Button, EmptyState } from '@lenserfight/ui/components'
import { Field, Input, Switch, TextArea } from '@lenserfight/ui/forms'

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
        <div className="mb-4 flex items-center gap-2">
          <Clock3 size={16} className="text-primary-yellow-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {editingScheduleId ? 'Edit CRON schedule' : 'Create CRON schedule'}
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field id="schedule-workflow" label="Workflow">
            <select
              id="schedule-workflow"
              value={workflowId}
              onChange={(event) => setWorkflowId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.title}
                </option>
              ))}
            </select>
          </Field>

          <Field id="schedule-model" label="Model override">
            <select
              id="schedule-model"
              value={globalModelId}
              onChange={(event) => setGlobalModelId(event.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            >
              <option value="">Use workflow default</option>
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
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
                  <div className="flex flex-wrap gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>CRON: {schedule.cron_expr}</span>
                    <span>Status: {schedule.is_active ? 'active' : 'paused'}</span>
                    {schedule.last_dispatch_status && (
                      <span>Last dispatch: {schedule.last_dispatch_status}</span>
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
