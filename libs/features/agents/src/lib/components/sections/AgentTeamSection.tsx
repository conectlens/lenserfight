import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { EmptyPanel } from '../EmptyPanel'

import { TeamBoard } from './_shared'
import { SectionPage } from './SectionPage'

import type {
  AgentTeamEdgeRecord,
  AgentTeamMemberRecord,
} from '@lenserfight/types'

export const AgentTeamSection: React.FC = () => {
  const { profile, bootstrap, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [teamName, setTeamName] = useState('')
  const [teamDescription, setTeamDescription] = useState('')

  const teams = bootstrap?.teams ?? []

  const createTeam = useMutation({
    mutationFn: () =>
      agentWorkspaceService.createTeam({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        agent_id: bootstrap!.ai_lenser_id,
        name: teamName.trim() || 'Executive Team',
        description:
          teamDescription.trim() ||
          'Primary autonomous team for this workspace.',
      }),
    onSuccess: async () => {
      setTeamName('')
      setTeamDescription('')
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
      })
    },
  })

  const isAgentOwner = viewMode === 'agent_owner'

  return (
    <SectionPage
      eyebrow="Agent team"
      title="Team and lane composition"
      description={
        isAgentOwner
          ? 'Teams group operators into lanes with delegation edges. Add lead operators, specialists, and reviewers to unlock parallel runs.'
          : 'Teams owned by this Lenser. Switch into the agent workspace to manage team membership.'
      }
    >
      <div className="space-y-6">
        {teams.length === 0 ? (
          <EmptyPanel
            icon={<Bot size={22} />}
            title="No active team exists"
            description="Create a named team to unlock the board-style graph, delegation lanes, and team-targeted schedules."
          >
            {isAgentOwner && bootstrap && (
              <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Executive Team"
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <input
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Primary autonomous team for this workspace"
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-amber-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => createTeam.mutate()}
                  disabled={createTeam.isPending || !bootstrap}
                  className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50 dark:bg-white dark:text-gray-900"
                >
                  {createTeam.isPending ? 'Creating…' : 'Create team'}
                </button>
              </div>
            )}
          </EmptyPanel>
        ) : (
          teams.map((team) => (
            <TeamBoard
              key={team.id}
              team={team}
              members={
                (team.members as AgentTeamMemberRecord[] | undefined) ?? []
              }
              edges={(team.edges as AgentTeamEdgeRecord[] | undefined) ?? []}
            />
          ))
        )}
      </div>
    </SectionPage>
  )
}
