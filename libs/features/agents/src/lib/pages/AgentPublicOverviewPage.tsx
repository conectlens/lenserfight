import { queryKeys } from '@lenserfight/data/cache'
import {
  agentsService,
  workflowsService,
  type AgentProfileView,
  type WorkflowRecord,
} from '@lenserfight/data/repositories'
import type { LenserProfileDTO } from '@lenserfight/types'
import { useQuery } from '@tanstack/react-query'
import { Bot, GitBranch, Sparkles } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'
import { EmptyPanel } from '../components/EmptyPanel'

interface AgentPublicOverviewPageProps {
  profile: LenserProfileDTO
}

/**
 * Agent-Public mode renderer for /lenser/:agent-handle/ag/overview.
 *
 * Stripped-down read-only view of an Agent Lenser when the viewer is NOT the
 * owner. Hides scratchpad, approvals, tool/model bindings, runs, schedules,
 * and settings. Surfaces only:
 *   - Identity card (name, handle, runtime preference, public stats)
 *   - Public workflows owned by the agent
 *
 * Public lenses authored by the agent live on the existing
 * /lenser/:handle/lenses tab; we link there rather than duplicating the grid.
 */
export const AgentPublicOverviewPage: React.FC<AgentPublicOverviewPageProps> = ({
  profile,
}) => {
  const { data: agent = null, isLoading: agentLoading } =
    useQuery<AgentProfileView | null>({
      queryKey: queryKeys.agents.detailByProfile(profile.id),
      queryFn: () => agentsService.getAgentProfileByProfileId(profile.id),
      enabled: !!profile.id,
      staleTime: 60_000,
    })

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery<
    WorkflowRecord[]
  >({
    queryKey: [...queryKeys.workflows.byLenser(profile.id), 'public'],
    queryFn: () => workflowsService.listByLenser(profile.id),
    enabled: !!profile.id,
    staleTime: 60_000,
  })

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-gray-200 bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 shadow-sm dark:border-gray-800 dark:from-[#0f0f10] dark:via-[#101010] dark:to-[#0d0d0e]">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-600 dark:text-gray-300">
          Agent overview
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
          {profile.display_name || `@${profile.handle}`}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          @{profile.handle}
        </p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
          A public read-only view of this Agent Lenser. Sign in as the owner to
          access the control room, schedules, and approvals.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Status
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {agentLoading
              ? '…'
              : agent?.is_active
                ? 'Active'
                : agent
                  ? 'Inactive'
                  : 'Unknown'}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Runtime: {agent?.runtime_pref ?? 'unknown'}
          </p>
        </div>
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Public lenses
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {agentLoading ? '…' : (agent?.lens_count ?? 0)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              to={`/lenser/${profile.handle}/lenses`}
              className="font-semibold text-amber-700 hover:underline dark:text-amber-300"
            >
              View lens library →
            </Link>
          </p>
        </div>
        <div className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Models bound
          </p>
          <p className="mt-3 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
            {agentLoading ? '…' : (agent?.model_count ?? 0)}
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Visible to the public catalog only.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Public workflows
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Workflows owned by this agent that are visible to the public.
        </p>
        <div className="mt-4 space-y-4">
          {workflowsLoading ? (
            <div className="h-20 animate-pulse rounded-2xl border border-gray-100 bg-gray-50 dark:border-gray-700 dark:bg-gray-900" />
          ) : workflows.length === 0 ? (
            <EmptyPanel
              icon={<Sparkles size={22} />}
              title="No public workflows yet"
              description="This agent has not published any public workflows."
            />
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                      <GitBranch size={18} className="text-amber-500" />
                      {workflow.title}
                    </h3>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {workflow.description ?? 'No workflow description.'}
                    </p>
                  </div>
                  <Link
                    to={`/workflows/${workflow.id}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-amber-300 hover:text-amber-700 dark:border-gray-700 dark:text-gray-200"
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <EmptyPanel
        icon={<Bot size={22} />}
        title="Want to manage this agent?"
        description="Owners and co-owners see the full control room with schedules, approvals, scratchpad, and audit logs. Sign in with the owning account to access those tools."
      />
    </section>
  )
}
