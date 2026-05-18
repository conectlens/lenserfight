import {
  agentWorkspaceService,
  type CreateWorkflowAssignmentInput,
} from '@lenserfight/data/repositories'
import type { WorkflowRecord } from '@lenserfight/data/repositories'
import type { AgentWorkflowAssignmentRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { DrawerDocsLink } from './DrawerDocsLink'

const ASSIGNEE_KIND_OPTIONS = [
  { value: 'agent', label: 'agent' },
  { value: 'team', label: 'team' },
  { value: 'evaluator', label: 'evaluator' },
]

interface Props {
  open: boolean
  onClose: () => void
  aiLenserId: string
  workflows: WorkflowRecord[]
  teams: Array<{ id: string; name: string }>
  initial?: AgentWorkflowAssignmentRecord | null
  defaultAssigneeKind?: 'agent' | 'team' | 'evaluator'
  defaultTeamId?: string | null
  onSaved?: () => void
}

export const WorkflowAssignmentDrawer: React.FC<Props> = ({
  open,
  onClose,
  aiLenserId,
  workflows,
  teams,
  initial,
  defaultAssigneeKind = 'agent',
  defaultTeamId = null,
  onSaved,
}) => {
  const isEdit = !!initial

  const [workflowId, setWorkflowId] = useState(initial?.workflow_id ?? workflows[0]?.id ?? '')
  const [assigneeKind, setAssigneeKind] = useState<'agent' | 'team' | 'evaluator'>(
    (initial?.assignee_kind as 'agent' | 'team' | 'evaluator') ?? defaultAssigneeKind
  )
  const [assigneeTeamId, setAssigneeTeamId] = useState(initial?.assignee_team_id ?? defaultTeamId ?? '')
  const [approvalPolicyJson, setApprovalPolicyJson] = useState(
    JSON.stringify(initial?.approval_policy ?? { mode: 'none' }, null, 2)
  )
  const [retryPolicyJson, setRetryPolicyJson] = useState(
    JSON.stringify(initial?.retry_policy ?? { mode: 'none' }, null, 2)
  )
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workflowOptions = useMemo(
    () => workflows.map((w) => ({ value: w.id, label: w.title })),
    [workflows]
  )
  const teamOptions = useMemo(
    () => teams.map((t) => ({ value: t.id, label: t.name })),
    [teams]
  )

  useEffect(() => {
    if (!open) return
    setWorkflowId(initial?.workflow_id ?? workflows[0]?.id ?? '')
    setAssigneeKind((initial?.assignee_kind as 'agent' | 'team' | 'evaluator') ?? defaultAssigneeKind)
    setAssigneeTeamId(initial?.assignee_team_id ?? defaultTeamId ?? '')
    setApprovalPolicyJson(JSON.stringify(initial?.approval_policy ?? { mode: 'none' }, null, 2))
    setRetryPolicyJson(JSON.stringify(initial?.retry_policy ?? { mode: 'none' }, null, 2))
    setIsActive(initial?.is_active ?? true)
    setError(null)
  }, [open, initial, workflows, defaultAssigneeKind, defaultTeamId])

  const handleSave = async () => {
    if (!workflowId) {
      setError('Select a workflow')
      return
    }
    if (assigneeKind === 'team' && !assigneeTeamId) {
      setError('Select a team')
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
      title={isEdit ? 'Edit workflow assignment' : 'Assign agent to workflow'}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/workflow-assignment"
          tip="Bind a workflow to an executor — agent, team, or evaluator. Approval and retry policies govern every dispatched run. Inactive assignments are ignored by schedules and webhooks."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          isLoading={submitting}
          disabled={submitting || !workflowId}
        />
      }
    >
      <div className="space-y-4">
        <FieldLabel
          label="Workflow"
          tooltip="The workflow to assign. Only workflows visible to this workspace appear in the list."
        >
          <SelectField
            value={workflowId}
            onChange={setWorkflowId}
            options={workflowOptions}
            placeholder={workflows.length === 0 ? 'No workflows available' : 'Select a workflow'}
            disabled={workflows.length === 0}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-3">
          <FieldLabel
            label="Assignee kind"
            tooltip="'agent' dispatches to this agent; 'team' routes to all active members of a crew; 'evaluator' triggers a scoring suite post-run instead of executing workflow nodes."
          >
            <SelectField
              value={assigneeKind}
              onChange={(v) => setAssigneeKind(v as 'agent' | 'team' | 'evaluator')}
              options={ASSIGNEE_KIND_OPTIONS}
            />
          </FieldLabel>

          {assigneeKind === 'team' && (
            <FieldLabel
              label="Team"
              tooltip="The agent team that receives dispatched runs. Every active member executes in parallel according to the team's edge graph."
            >
              <SelectField
                value={assigneeTeamId}
                onChange={setAssigneeTeamId}
                options={teamOptions}
                placeholder="— select team —"
              />
            </FieldLabel>
          )}
        </div>

        {assigneeKind === 'evaluator' && (
          <div className="rounded-2xl border border-primary-yellow-200 bg-primary-yellow-50 px-3 py-2 text-xs text-primary-yellow-700 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-300">
            Evaluator agents trigger evaluation suites post-run instead of executing workflow nodes.
          </div>
        )}

        <FieldLabel
          label="Approval policy (JSON)"
          tooltip="Controls when runs require human sign-off. Default {'mode':'none'} skips all gates. Use {'mode':'all'} to gate every run, or {'mode':'on_write'} for runs that modify data."
        >
          <textarea
            rows={3}
            value={approvalPolicyJson}
            onChange={(e) => setApprovalPolicyJson(e.target.value)}
            placeholder='{"mode":"none"}'
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </FieldLabel>

        <FieldLabel
          label="Retry policy (JSON)"
          tooltip="Controls automatic retries on failure. Default {'mode':'none'} means no retry. Example: {'mode':'linear','max':3,'delay_ms':5000} retries three times with 5 s between attempts."
        >
          <textarea
            rows={3}
            value={retryPolicyJson}
            onChange={(e) => setRetryPolicyJson(e.target.value)}
            placeholder='{"mode":"none"}'
            className={`${inputClass} resize-none font-mono text-xs`}
          />
        </FieldLabel>

        <Tooltip
          content="Inactive assignments are ignored by schedules and webhooks. Use to pause dispatch without deleting the assignment record."
          position="top"
          contentClassName="max-w-xs whitespace-normal text-left"
        >
          <label className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span className="text-gray-700 dark:text-gray-200">Active</span>
          </label>
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
