import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { Drawer } from '@lenserfight/ui/overlays'
import type { AgentTeamMemberRecord } from '@lenserfight/types'
import React, { useEffect, useState } from 'react'

import type { AgentProfileView } from '@lenserfight/data/repositories'

interface AddTeamMemberDrawerProps {
  open: boolean
  onClose: () => void
  teamId: string
  agents: AgentProfileView[]
  defaultAgentId?: string
  initial?: AgentTeamMemberRecord | null
  onSaved?: () => void
}

const ROLES = ['leader', 'executor', 'reviewer', 'operator', 'observer']

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
    >
      <div className="space-y-4">
        {!isEdit && (
          <Field label="Agent">
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select an AI Lenser</option>
              {agents.map((agent) => (
                <option key={agent.ai_lenser_id} value={agent.ai_lenser_id}>
                  {agent.display_name} (@{agent.handle})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-400">
              Pick one of the owner&apos;s AI Lensers for this crew slot.
            </p>
          </Field>
        )}
        {isEdit && (
          <Field label="Agent">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {(agents.find((agent) => agent.ai_lenser_id === initial?.agent_id)?.display_name ?? initial?.agent_id) || 'Unknown agent'}
            </div>
          </Field>
        )}
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Responsibility">
          <textarea
            rows={2}
            value={responsibility}
            onChange={(e) => setResponsibility(e.target.value)}
            placeholder="Handles delegation and final review of outputs."
            className={inputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Lane">
            <input
              type="number"
              min={1}
              max={10}
              value={lane}
              onChange={(e) => setLane(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field label="Sort order">
            <input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className={inputClass}
            />
          </Field>
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
            disabled={submitting || (!isEdit && agents.length === 0)}
            className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
          >
            {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add member'}
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
