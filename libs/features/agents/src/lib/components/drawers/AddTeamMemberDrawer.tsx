import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { AgentTeamMemberRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import type { AgentProfileView } from '@lenserfight/data/repositories'
import { DrawerDocsLink } from './DrawerDocsLink'

interface AddTeamMemberDrawerProps {
  open: boolean
  onClose: () => void
  teamId: string
  agents: AgentProfileView[]
  defaultAgentId?: string
  initial?: AgentTeamMemberRecord | null
  onSaved?: () => void
}

const ROLE_OPTIONS = ['leader', 'executor', 'reviewer', 'operator', 'observer'].map((r) => ({
  value: r,
  label: r,
}))

export const AddTeamMemberDrawer: React.FC<AddTeamMemberDrawerProps> = ({
  open,
  onClose,
  teamId,
  agents,
  defaultAgentId = '',
  initial,
  onSaved,
}) => {
  const isEdit = !!initial
  const [agentId, setAgentId] = useState(initial?.agent_id ?? defaultAgentId)
  const [role, setRole] = useState(initial?.role ?? 'leader')
  const [responsibility, setResponsibility] = useState(initial?.responsibility ?? '')
  const [lane, setLane] = useState(initial?.lane ?? 1)
  const [sortOrder, setSortOrder] = useState(initial?.sort_order ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agentOptions = useMemo(
    () =>
      agents.map((agent) => ({
        value: agent.ai_lenser_id,
        label: `${agent.display_name} (@${agent.handle})`,
      })),
    [agents]
  )

  useEffect(() => {
    if (!open) return
    setAgentId(initial?.agent_id ?? defaultAgentId)
    setRole(initial?.role ?? 'leader')
    setResponsibility(initial?.responsibility ?? '')
    setLane(initial?.lane ?? 1)
    setSortOrder(initial?.sort_order ?? 0)
    setError(null)
  }, [open, initial, defaultAgentId])

  const handleSave = async () => {
    if (!agentId.trim()) {
      setError('Agent ID is required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      if (isEdit && initial) {
        await agentWorkspaceService.updateTeamMember(initial.id, {
          role,
          responsibility,
          lane,
          sort_order: sortOrder,
        })
      } else {
        await agentWorkspaceService.addTeamMember({
          team_id: teamId,
          agent_id: agentId.trim(),
          role,
          responsibility: responsibility || null,
          lane,
          sort_order: sortOrder,
        })
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
      width="w-[480px]"
      title={isEdit ? 'Edit team member' : 'Add team member'}
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/add-team-member"
          tip="Attach an existing AI Lenser to the active team. Pick a member, choose a role (leader/executor/reviewer/operator/observer), set a lane for parallel execution control, and optionally describe the member's responsibility."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          submitLabel={submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}
          isLoading={submitting}
          disabled={submitting || (!isEdit && agents.length === 0)}
        />
      }
    >
      <div className="space-y-4">
        {!isEdit && (
          <FieldLabel
            label="Agent"
            tooltip="The AI Lenser joining this crew. Can be any agent owned by the same workspace."
          >
            <SelectField
              value={agentId}
              onChange={setAgentId}
              options={agentOptions}
              placeholder="Select an AI Lenser"
            />
            <p className="mt-1 text-xs text-gray-400">
              Pick one of the owner&apos;s AI Lensers for this crew slot.
            </p>
          </FieldLabel>
        )}

        {isEdit && (
          <FieldLabel label="Agent">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {(agents.find((agent) => agent.ai_lenser_id === initial?.agent_id)?.display_name ?? initial?.agent_id) || 'Unknown agent'}
            </div>
          </FieldLabel>
        )}

        <FieldLabel
          label="Role"
          tooltip="Determines position in the execution graph. 'leader' coordinates others and owns final delivery; 'executor' runs tasks; 'reviewer' checks outputs; 'operator' handles tooling; 'observer' monitors silently."
        >
          <SelectField value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </FieldLabel>

        <FieldLabel
          label="Responsibility"
          tooltip="Freeform description of this member's task. Injected into the team's routing prompt so the scheduler knows when to activate this member."
        >
          <textarea
            rows={2}
            value={responsibility}
            onChange={(e) => setResponsibility(e.target.value)}
            placeholder="Handles delegation and final review of outputs."
            className={inputClass}
          />
        </FieldLabel>

        <div className="grid grid-cols-2 gap-4">
          <FieldLabel
            label="Lane"
            tooltip="Execution lane number (1–10). Members in the same lane may run in parallel; members in different lanes run sequentially in ascending lane order."
          >
            <input
              type="number"
              min={1}
              max={10}
              value={lane}
              onChange={(e) => setLane(Number(e.target.value))}
              className={inputClass}
            />
          </FieldLabel>

          <FieldLabel
            label="Sort order"
            tooltip="Within the same lane, lower numbers execute first. Use to control step ordering when multiple members share a lane."
          >
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={inputClass}
            />
          </FieldLabel>
        </div>

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
