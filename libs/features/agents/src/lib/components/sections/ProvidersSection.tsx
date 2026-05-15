import { queryKeys } from '@lenserfight/data/cache'
import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ProviderConfigRecord } from '@lenserfight/types'
import { AICatalogShowroom } from '@lenserfight/features/generations'
import { useQuery } from '@tanstack/react-query'
import { Settings2 } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import {
  ConfigureProviderDrawer,
  type ProviderInfo,
} from '../drawers/ConfigureProviderDrawer'

import { SectionPage } from './SectionPage'
import { Button } from '@lenserfight/ui/components'


const KNOWN_PROVIDERS: Pick<ProviderInfo, 'key' | 'name'>[] = [
  { key: 'anthropic', name: 'Anthropic' },
  { key: 'openai', name: 'OpenAI' },
  { key: 'google', name: 'Google Gemini' },
  { key: 'mistral', name: 'Mistral AI' },
  { key: 'fal', name: 'fal.ai' },
  { key: 'elevenlabs', name: 'ElevenLabs' },
  { key: 'stability', name: 'Stability AI' },
  { key: 'ollama', name: 'Ollama (self-hosted)' },
]

const STATUS_LABEL: Record<string, string> = {
  healthy: 'Connected',
  error: 'Error',
  unconfigured: 'Not configured',
}

const STATUS_CLASS: Record<string, string> = {
  healthy: 'text-green-600 dark:text-green-400',
  error: 'text-red-500 dark:text-red-400',
  unconfigured: 'text-gray-400',
}

export const ProvidersSection: React.FC = () => {
  const { viewMode, bootstrap } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner'
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''

  const [configTarget, setConfigTarget] = useState<ProviderInfo | null>(null)

  const configsQuery = useQuery<ProviderConfigRecord[]>({
    queryKey: queryKeys.agents.providers(aiLenserId),
    queryFn: () => agentWorkspaceService.listProviderConfigs(aiLenserId),
    enabled: isOwner && !!aiLenserId,
    staleTime: 30_000,
  })

  const configMap = new Map(
    (configsQuery.data ?? []).map((c) => [c.provider_key, c])
  )

  const providers: ProviderInfo[] = KNOWN_PROVIDERS.map((p) => ({
    key: p.key,
    name: p.name,
    status: configMap.get(p.key)?.status ?? 'unconfigured',
    config: configMap.get(p.key) ?? null,
  }))

  return (
    <SectionPage
      eyebrow="Providers"
      docsPath="/how-to/agents/workspace/providers"
      docsTip="Per-provider BYOK keys (encrypted at rest), region binding, and reachability status. Add a default model to skip per-workflow picking."
      title="Runtime providers"
      description="Anthropic, OpenAI, Mistral, Gemini, fal.ai, ElevenLabs, Stability AI, Ollama, and others. Configure per-provider BYOK API keys, run health checks, and sync models."
    >
      {isOwner && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {providers.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {p.name}
                </p>
                <p className={`mt-0.5 text-xs ${STATUS_CLASS[p.status ?? 'unconfigured']}`}>
                  {STATUS_LABEL[p.status ?? 'unconfigured']}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => setConfigTarget(p)}
                aria-label={`Configure ${p.name}`}
                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:border-primary-yellow-300 hover:text-primary-yellow-600 dark:border-gray-700 dark:text-gray-400"
              >
                <Settings2 size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}

      <AICatalogShowroom embedded focus="providers" title="Provider showroom" />

      {configTarget && (
        <ConfigureProviderDrawer
          open={!!configTarget}
          onClose={() => setConfigTarget(null)}
          provider={configTarget}
          aiLenserId={aiLenserId}
        />
      )}
    </SectionPage>
  )
}
