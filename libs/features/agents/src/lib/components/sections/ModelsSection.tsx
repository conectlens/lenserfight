import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { AICatalogShowroom } from '@lenserfight/features/generations'
import type { AgentModelProfileRecord } from '@lenserfight/types'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Star, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { BindModelDrawer } from '../drawers/BindModelDrawer'

import { SectionPage } from './SectionPage'

export const ModelsSection: React.FC = () => {
  const { bootstrap, profile, viewMode } = useAgentWorkspace()
  const queryClient = useQueryClient()
  const isOwner = viewMode === 'agent_owner'
  const [editTarget, setEditTarget] = useState<AgentModelProfileRecord | null>(null)

  const modelProfiles = (bootstrap?.profiles?.models as AgentModelProfileRecord[] | undefined) ?? []

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
    })

  const create = useMutation({
    mutationFn: (model: {
      provider_key: string
      key: string
      name: string
      id: string
      support_level: string
    }) =>
      agentWorkspaceService.createModelProfile({
        ai_lenser_id: bootstrap!.ai_lenser_id,
        name: `${model.name} profile`,
        provider_key: model.provider_key,
        model_key: model.key,
        model_id: model.id,
        support_level: model.support_level,
        params: { temperature: 0.4, maxTokens: 4096 },
      }),
    onSuccess: invalidate,
  })

  const deleteProfile = useMutation({
    mutationFn: (id: string) => agentWorkspaceService.deleteModelProfile(id),
    onSuccess: invalidate,
  })

  return (
    <SectionPage
      eyebrow="Models"
      title="Model catalog and bindings"
      description="Browse available LLMs and bind defaults / fallbacks to this workspace. Selecting a model creates a model profile bound to the agent."
    >
      {isOwner && (
        <AICatalogShowroom
          embedded
          focus="models"
          title="Agent model showroom"
          onModelSelect={(model) =>
            bootstrap &&
            create.mutate({
              id: model.id,
              key: model.key,
              name: model.name,
              provider_key: model.provider_key,
              support_level: model.support_level,
            })
          }
        />
      )}

      {modelProfiles.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
            Bound model profiles
          </p>
          <div className="overflow-x-auto rounded-[24px] border border-gray-200 dark:border-gray-800">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-950">
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                  <th className="px-4 py-3">Profile</th>
                  <th className="px-4 py-3">Model</th>
                  <th className="px-4 py-3">Provider</th>
                  <th className="px-4 py-3">Temp</th>
                  <th className="px-4 py-3">Default</th>
                  {isOwner && <th className="px-4 py-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm dark:divide-gray-800 dark:bg-gray-900">
                {modelProfiles.map((mp) => (
                  <tr key={mp.id}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                      {mp.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {mp.model_key ?? mp.model_id ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {mp.provider_key ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {(mp.params?.temperature as number | undefined) ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {mp.is_default && (
                        <Star
                          size={14}
                          className="text-amber-500"
                          aria-label="Default model"
                        />
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditTarget(mp)}
                            aria-label="Edit model profile"
                            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Delete model profile "${mp.name}"?`)) {
                                deleteProfile.mutate(mp.id)
                              }
                            }}
                            aria-label="Delete model profile"
                            className="rounded-xl p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editTarget && (
        <BindModelDrawer
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          profile={editTarget}
          onSaved={() => {
            invalidate()
            setEditTarget(null)
          }}
        />
      )}
    </SectionPage>
  )
}
