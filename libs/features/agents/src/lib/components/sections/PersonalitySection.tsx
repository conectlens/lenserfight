import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { PersonalityProfileDrawer } from '../drawers/PersonalityProfileDrawer'
import { EmptyPanel } from '../EmptyPanel'

import { SectionPage } from './SectionPage'

import type { AgentPersonalityProfileRecord } from '@lenserfight/types'

export const PersonalitySection: React.FC = () => {
  const { bootstrap, profile, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<AgentPersonalityProfileRecord | null>(
    null
  )

  const profiles =
    (bootstrap?.profiles.personality as
      | AgentPersonalityProfileRecord[]
      | undefined) ?? []
  const isAgentOwner = viewMode === 'agent_owner'

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const remove = useMutation({
    mutationFn: (id: string) =>
      agentWorkspaceService.deletePersonalityProfile(id),
    onSuccess: invalidate,
  })

  return (
    <SectionPage
      eyebrow="Personality"
      title="Personality profiles"
      description="Set communication style, autonomy posture, escalation behavior, and decision style. Personality cannot grant tools or memory access; it only shapes how the agent communicates and reasons."
      toolbar={
        isAgentOwner && bootstrap ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setDrawerOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 dark:bg-white dark:text-gray-900"
          >
            <Plus size={16} />
            New personality profile
          </button>
        ) : undefined
      }
    >
      {profiles.length === 0 ? (
        <EmptyPanel
          icon={<ClipboardList size={20} />}
          title="No personality profiles yet"
          description="Profiles let owners tune tone, expertise, autonomy, and escalation rules per workflow or team."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {p.name}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {p.tone} · {p.expertise_level} · {p.autonomy_level}
                  </p>
                </div>
                {isAgentOwner && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(p)
                        setDrawerOpen(true)
                      }}
                      className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete personality "${p.name}"?`)) {
                          remove.mutate(p.id)
                        }
                      }}
                      className="rounded-xl border border-gray-200 p-2 text-gray-500 hover:text-red-600 dark:border-gray-700 dark:text-gray-400"
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
                {p.system_prompt_patch}
              </p>
            </div>
          ))}
        </div>
      )}

      {isAgentOwner && bootstrap && (
        <PersonalityProfileDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          aiLenserId={bootstrap.ai_lenser_id}
          initial={editing}
          onSaved={invalidate}
        />
      )}
    </SectionPage>
  )
}
