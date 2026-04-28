import { ChevronRight, GitBranch } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

export const WorkflowsSection: React.FC = () => {
  const { workflows, profile, viewMode } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner' || viewMode === 'human_owner'

  return (
    <SectionPage
      eyebrow="Workflows"
      title="Connected lens workflows"
      description={
        isOwner
          ? 'Workflows are the operational units this workspace runs manually, on CRON schedules, or behind approval gates. Open the builder to wire lenses together.'
          : 'Public workflows owned by this Lenser.'
      }
      toolbar={
        isOwner ? (
          <Link
            to={`/lenser/${profile.handle}/workflows`}
            className="rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
          >
            Open builder
          </Link>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {workflows.length === 0 ? (
          <EmptyPanel
            icon={<GitBranch size={20} />}
            title="No workflows yet"
            description="Workflows become the operational units that teams run manually, on CRON schedules, or behind approval gates."
          />
        ) : (
          workflows.map((workflow) => (
            <div
              key={workflow.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {workflow.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {workflow.description || 'No workflow description yet.'}
                  </p>
                </div>
                <Link
                  to={`/workflows/${workflow.id}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                >
                  Open builder <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </SectionPage>
  )
}
