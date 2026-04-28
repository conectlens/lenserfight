import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import { AICatalogShowroom } from '@lenserfight/features/generations'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'

import { SectionPage } from './SectionPage'

export const ModelsSection: React.FC = () => {
  const { bootstrap, profile } = useAgentWorkspace()
  const queryClient = useQueryClient()

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.agents.workspaceBootstrap(profile.handle),
      })
    },
  })

  return (
    <SectionPage
      eyebrow="Models"
      title="Model catalog and bindings"
      description="Browse available LLMs and bind defaults / fallbacks to this workspace. Selecting a model creates a model profile bound to the agent."
    >
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
    </SectionPage>
  )
}
