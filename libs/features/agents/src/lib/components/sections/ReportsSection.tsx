import { BarChart3, ClipboardList, Layers3 } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BootstrapStatusPanel } from '../BootstrapStatusPanel'

import { ProfileCard, StatCard } from './_shared'
import { SectionPage } from './SectionPage'

export const ReportsSection: React.FC = () => {
  const { bootstrap, bootstrapState, workflows, schedules } = useAgentWorkspace()

  const runs = bootstrap?.runs ?? []
  const teams = bootstrap?.teams ?? []
  const completedRuns = runs.filter((run) => run.status === 'completed').length
  const blockedRuns = runs.filter((run) => run.status === 'blocked').length

  return (
    <SectionPage
      eyebrow="Reports"
      title="Execution reports and summaries"
      description="Use reports to review what the workspace has been doing, where runs are getting blocked, and which automation surfaces need attention next."
    >
      <BootstrapStatusPanel state={bootstrapState} />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Completed runs"
          value={String(completedRuns)}
          detail="Runs that reached a successful terminal state."
        />
        <StatCard
          label="Blocked runs"
          value={String(blockedRuns)}
          detail="Runs paused for human input, missing configuration, or unresolved dependencies."
        />
        <StatCard
          label="Active schedules"
          value={String(schedules.filter((schedule) => schedule.is_active).length)}
          detail="Automations currently eligible for dispatch."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ProfileCard
          title="Workspace health"
          subtitle="A quick roll-up of the automation surface attached to this agent workspace."
        >
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <Layers3 size={16} className="text-amber-600 dark:text-amber-300" />
              <span>{teams.length} team configuration{teams.length === 1 ? '' : 's'} tracked in this workspace.</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 size={16} className="text-amber-600 dark:text-amber-300" />
              <span>{workflows.length} workflow{workflows.length === 1 ? '' : 's'} available for automation and routing.</span>
            </div>
            <div className="flex items-center gap-2">
              <ClipboardList size={16} className="text-amber-600 dark:text-amber-300" />
              <span>{runs.length} recent team run{runs.length === 1 ? '' : 's'} available for follow-up analysis.</span>
            </div>
          </div>
        </ProfileCard>
      </div>
    </SectionPage>
  )
}
