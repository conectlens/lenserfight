import { AICatalogShowroom } from '@lenserfight/features/generations'
import { Settings2 } from 'lucide-react'
import React, { useState } from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import type { ProviderInfo } from '../drawers/ConfigureProviderDrawer'
import { ConfigureProviderDrawer } from '../drawers/ConfigureProviderDrawer'

import { SectionPage } from './SectionPage'

const KNOWN_PROVIDERS: ProviderInfo[] = [
  { key: 'anthropic', name: 'Anthropic', status: 'unconfigured' },
  { key: 'openai', name: 'OpenAI', status: 'unconfigured' },
  { key: 'google', name: 'Google Gemini', status: 'unconfigured' },
  { key: 'mistral', name: 'Mistral AI', status: 'unconfigured' },
  { key: 'fal', name: 'fal.ai', status: 'unconfigured' },
  { key: 'elevenlabs', name: 'ElevenLabs', status: 'unconfigured' },
  { key: 'stability', name: 'Stability AI', status: 'unconfigured' },
  { key: 'ollama', name: 'Ollama (self-hosted)', status: 'unconfigured' },
]

export const ProvidersSection: React.FC = () => {
  const { viewMode } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner'
  const [configTarget, setConfigTarget] = useState<ProviderInfo | null>(null)

  return (
    <SectionPage
      eyebrow="Providers"
      title="Runtime providers"
      description="Anthropic, OpenAI, Mistral, Gemini, fal.ai, ElevenLabs, Stability AI, Ollama, and others. Configure per-provider BYOK API keys, run health checks, and sync models."
    >
      {isOwner && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {KNOWN_PROVIDERS.map((p) => (
            <div
              key={p.key}
              className="flex items-center justify-between rounded-[20px] border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{p.status}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfigTarget(p)}
                aria-label={`Configure ${p.name}`}
                className="rounded-xl border border-gray-200 p-1.5 text-gray-500 hover:border-amber-300 hover:text-amber-600 dark:border-gray-700 dark:text-gray-400"
              >
                <Settings2 size={14} />
              </button>
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
        />
      )}
    </SectionPage>
  )
}
