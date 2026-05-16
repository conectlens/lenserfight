import { agentWorkspaceService, agentsService } from '@lenserfight/data/repositories'
import type { AgentProfileView } from '@lenserfight/data/repositories'
import type { AgentTeamRecord } from '@lenserfight/types'
import { Tooltip } from '@lenserfight/ui/components'
import { SelectField } from '@lenserfight/ui/forms'
import { Drawer, DrawerFooter } from '@lenserfight/ui/overlays'
import { useQuery } from '@tanstack/react-query'
import { HelpCircle } from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

import { DrawerDocsLink } from './DrawerDocsLink'

const ACTIVATION_OPTIONS = [
  { value: 'active', label: 'Active crew' },
  { value: 'draft', label: 'Draft crew' },
]

interface CreateTeamDrawerProps {
  open: boolean
  onClose: () => void
  aiLenserId: string
  ownerLenserId: string
  onCreated?: (team: AgentTeamRecord) => void
}

type ActivationMode = 'active' | 'draft'

export const CreateTeamDrawer: React.FC<CreateTeamDrawerProps> = ({
  open,
  onClose,
  aiLenserId,
  ownerLenserId,
  onCreated,
}) => {
  const agentsQuery = useQuery<AgentProfileView[]>({
    queryKey: ['agents', 'team-creator', ownerLenserId],
    queryFn: () => agentsService.getAgentsByOwner(ownerLenserId),
    enabled: open && !!ownerLenserId,
    staleTime: 30_000,
  })

  const agents = agentsQuery.data ?? []
  const [name, setName] = useState('Autonomous Crew')
  const [purpose, setPurpose] = useState('')
  const [activationMode, setActivationMode] = useState<ActivationMode>('active')
  const [leadAgentId, setLeadAgentId] = useState(aiLenserId)
  const [selectedAgentIds, setSelectedAgentIds] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const defaultSelectedIds = useMemo(() => {
    const currentAgent = agents.find((agent) => agent.ai_lenser_id === aiLenserId)
    return currentAgent ? [currentAgent.ai_lenser_id] : agents[0] ? [agents[0].ai_lenser_id] : []
  }, [agents, aiLenserId])

  const leadAgentOptions = useMemo(() => {
    return selectedAgentIds.map((agentId) => {
      const agent = agents.find((item) => item.ai_lenser_id === agentId)
      const handle = agent?.handle ? ` (@${agent.handle})` : ''
      return {
        value: agentId,
        label: `${agent?.display_name ?? agentId}${handle}`,
      }
    })
  }, [agents, selectedAgentIds])

  useEffect(() => {
    if (!open) return
    setName('Autonomous Crew')
    setPurpose('')
    setActivationMode('active')
    setLeadAgentId(defaultSelectedIds[0] ?? '')
    setSelectedAgentIds(defaultSelectedIds)
    setError(null)
  }, [open, defaultSelectedIds])

  const toggleAgent = (agentId: string) => {
    setSelectedAgentIds((current) => {
      if (current.includes(agentId)) {
        const next = current.filter((id) => id !== agentId)
        if (leadAgentId === agentId) {
          setLeadAgentId(next[0] ?? '')
        }
        return next
      }

      return [...current, agentId]
    })
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Team name is required.')
      return
    }
    if (selectedAgentIds.length === 0) {
      setError('Select at least one AI Lenser.')
      return
    }
    if (!leadAgentId || !selectedAgentIds.includes(leadAgentId)) {
      setError('Choose a lead agent from the selected members.')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const orderedIds = [leadAgentId, ...selectedAgentIds.filter((id) => id !== leadAgentId)]
      const team = await agentWorkspaceService.createTeam({
        ai_lenser_id: aiLenserId,
        name: name.trim(),
        description: purpose.trim() || null,
        status: activationMode === 'active' ? 'active' : 'paused',
        is_active: activationMode === 'active',
        initial_members: orderedIds.map((agentId, index) => ({
          agent_id: agentId,
          role: index === 0 ? 'leader' : 'executor',
          responsibility:
            index === 0
              ? purpose.trim() || 'Leads the autonomous crew and owns final delivery.'
              : 'Executes a specialized step inside the crew.',
          lane: index,
          sort_order: index,
        })),
      })

      if (!team) {
        throw new Error('Team could not be created.')
      }

      onCreated?.(team)
      onClose()
    } catch (err) {
      setError((err as Error).message ?? 'Create failed')
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
      title="Create new crew"
      headerExtra={
        <DrawerDocsLink
          path="/how-to/agents/workspace/drawers/create-team"
          tip="Bootstrap a new autonomous crew. Select member agents, choose a lead who coordinates delivery, and set activation mode. Members can be reordered and edges wired afterward in the Team Builder."
        />
      }
      footer={
        <DrawerFooter
          onCancel={onClose}
          onSubmit={handleSave}
          isLoading={submitting}
          submitLabel="Create crew"
          disabled={submitting}
        />
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-6 text-gray-500 dark:text-gray-400">
          Teams are reusable autonomous crews. Select the AI Lensers that participate, choose a lead,
          and then assign workflows or CRON schedules to this crew.
        </p>

        <FieldLabel
          label="Team name"
          tooltip="Label for this autonomous crew. Appears in schedules, run history, and approval queues."
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Autonomous Crew"
            className={inputClass}
          />
        </FieldLabel>

        <FieldLabel
          label="Purpose"
          tooltip="Describes the crew's mission. Injected into the team lead's system prompt for self-coordination decisions."
        >
          <textarea
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Example: Research, draft, review, and publish a weekly AI operations brief."
            className={`${inputClass} resize-none`}
          />
        </FieldLabel>

        <FieldLabel
          label="Activation mode"
          tooltip="'Active crew' can receive dispatched runs immediately after creation. 'Draft crew' is paused — safe for configuring members and edges without triggering workflows."
        >
          <SelectField
            value={activationMode}
            onChange={(v) => setActivationMode(v as ActivationMode)}
            options={ACTIVATION_OPTIONS}
          />
        </FieldLabel>

        <FieldLabel
          label="Lead agent"
          tooltip="The team member that coordinates the crew and owns final delivery. Must be one of the selected crew members. Assigned the 'leader' role automatically."
        >
          <SelectField
            value={leadAgentId}
            onChange={setLeadAgentId}
            options={leadAgentOptions}
            placeholder="Select a lead"
            disabled={agents.length === 0}
          />
        </FieldLabel>

        <div className="space-y-3">
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
              Crew members
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              AI agents are loaded only when this drawer opens so the sidebar stays light.
            </p>
          </div>

          {agentsQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-700"
                />
              ))}
            </div>
          ) : agents.length === 0 ? (
            <ErrorBanner message="No AI Lensers are available for this owner yet." />
          ) : (
            <div className="space-y-3">
              {agents.map((agent) => {
                const selected = selectedAgentIds.includes(agent.ai_lenser_id)
                return (
                  <label
                    key={agent.ai_lenser_id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition ${selected
                        ? 'border-primary-yellow-300 bg-primary-yellow-50 dark:border-primary-yellow-500/30 dark:bg-primary-yellow-500/10'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAgent(agent.ai_lenser_id)}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {agent.display_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{agent.handle} · {agent.runtime_pref}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {error && <ErrorBanner message={error} />}
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

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
    {message}
  </p>
)
