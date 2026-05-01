import {
  agentWorkspaceService,
  type CreateWorkflowAssignmentInput,
} from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AgentWorkflowAssignmentRecord } from '@lenserfight/types'
import { Drawer } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  workflows: WorkflowRecord[]
  teams: Array<{ id: string; name: string }>
  initial?: AgentWorkflowAssignmentRecord | null
  onSaved?: () => void
}

export const WorkflowAssignmentDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  workflows,
  teams,
  initial,
  onSaved,
}) => {
  const isEdit = !!initial

  const [workflowId, setWorkflowId] = useState(initial?.workflow_id ?? workflows[0]?.id ?? '')
  const [assigneeKind, setAssigneeKind] = useState<'agent' | 'team' | 'evaluator'>(
    (initial?.assignee_kind as 'agent' | 'team' | 'evaluator') ?? 'agent'
  )
  const [assigneeTeamId, setAssigneeTeamId] = useState(initial?.assignee_team_id ?? '')
  const [approvalPolicyJson, setApprovalPolicyJson] = useState(
    JSON.stringify(initial?.approval_policy ?? { mode: 'none' }, null, 2)
  )
  const [retryPolicyJson, setRetryPolicyJson] = useState(
    JSON.stringify(initial?.retry_policy ?? { mode: 'none' }, null, 2)
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setWorkflowId(initial?.workflow_id ?? workflows[0]?.id ?? '')
    setAssigneeKind((initial?.assignee_kind as 'agent' | 'team' | 'evaluator') ?? 'agent')
    setAssigneeTeamId(initial?.assignee_team_id ?? '')
    setApprovalPolicyJson(JSON.stringify(initial?.approval_policy ?? { mode: 'none' }, null, 2))
    setRetryPolicyJson(JSON.stringify(initial?.retry_policy ?? { mode: 'none' }, null, 2))
    setIsActive(initial?.is_active ?? true)
    setError(null)
  }, [open, initial, workflows])

  const handleSave = async () => {
    if (!workflowId) {
      setError('Select a workflow')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      let approvalPolicy: Record<string, unknown> = { mode: 'none' }
      let retryPolicy: Record<string, unknown> = { mode: 'none' }
      try {
        approvalPolicy = JSON.parse(approvalPolicyJson || '{"mode":"none"}')
      } catch {
        throw new Error('Approval policy must be valid JSON')
      }
      try {
        retryPolicy = JSON.parse(retryPolicyJson || '{"mode":"none"}')
      } catch {
        throw new Error('Retry policy must be valid JSON')
      }

      const isAgentLike = assigneeKind === 'agent' || assigneeKind === 'evaluator'
      if (isEdit) {
        await agentWorkspaceService.updateWorkflowAssignment(initial!.id, {
          workflow_id: workflowId,
          assignee_kind: assigneeKind,
          assignee_ai_lenser_id: isAgentLike ? aiLenserId : null,
          assignee_team_id: assigneeKind === 'team' ? (assigneeTeamId || null) : null,
          approval_policy: approvalPolicy,
          retry_policy: retryPolicy,
          is_active: isActive,
        })
        toast.success('Assignment updated')
      } else {
        const input: CreateWorkflowAssignmentInput = {
          ai_lenser_id: aiLenserId,
          workflow_id: workflowId,
          assignee_kind: assigneeKind,
          assignee_ai_lenser_id: isAgentLike ? aiLenserId : null,
          assignee_team_id: assigneeKind === 'team' ? (assigneeTeamId || null) : null,
          approval_policy: approvalPolicy,
          retry_policy: retryPolicy,
          is_active: isActive,
        }
        await agentWorkspaceService.createWorkflowAssignment(input)
        toast.success('Assignment created')
      }

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
      title={isEdit ? 'Edit assignment' : 'New assignment'}
    >
      <div className="space-y-4">
        <Field label="Workflow">
          <select
            value={workflowId}
            onChange={(e) => setWorkflowId(e.target.value)}
            className={inputClass}
          >
            {workflows.length === 0 ? (
              <option value="">No workflows available</option>
            ) : (
              workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))
            )}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Assignee kind">
            <select
              value={assigneeKind}
              onChange={(e) => setAssigneeKind(e.target.value as 'agent' | 'team' | 'evaluator')}
              className={inputClass}
            >
              <option value="agent">agent</option>
              <option value="team">team</option>
              <option value="evaluator">evaluator</option>
            </select>
          </Field>
          {assigneeKind === 'evaluator' && (
            <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              Evaluator agents trigger evaluation suites post-run instead of executing workflow nodes.
            </div>
          )}
          {assigneeKind === 'team' && (
            <Field label="Team">
              <select
                value={assigneeTeamId}
                onChange={(e) => setAssigneeTeamId(e.target.value)}
                className={inputClass}
              >
                <option value="">— select team —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        <Field label="Approval policy (JSON)">
          <textarea
            rows={3}
            value={approvalPolicyJson}
            onChange={(e) => setApprovalPolicyJson(e.target.value)}
            placeholder='{"mode":"none"}'
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </Field>

        <Field label="Retry policy (JSON)">
          <textarea
            rows={3}
            value={retryPolicyJson}
            onChange={(e) => setRetryPolicyJson(e.target.value)}
            placeholder='{"mode":"none"}'
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </Field>

        <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          <span className="text-gray-700 dark:text-gray-200">Active</span>
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

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
      {label}
    </span>
    {children}
  </label>
)
