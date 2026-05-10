import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ByokKeyHint } from '@lenserfight/data/repositories'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { KeyRound, ShieldCheck, ShieldX, Clock } from 'lucide-react'
import React from 'react'

import { useAgentWorkspace } from '../../context/AgentWorkspaceContext'
import { SectionPage } from './SectionPage'

function HealthBadge({ isValid, expiresAt }: { isValid: boolean; expiresAt?: string | null }) {
  if (!isValid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
        <ShieldX className="w-3 h-3" />
        Expired / Revoked
      </span>
    )
  }
  if (expiresAt) {
    const daysLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86_400_000)
    if (daysLeft < 30) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          <Clock className="w-3 h-3" />
          Expires in {daysLeft}d
        </span>
      )
    }
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <ShieldCheck className="w-3 h-3" />
      Active
    </span>
  )
}

export const ByokSection: React.FC = () => {
  const { viewMode, bootstrap } = useAgentWorkspace()
  const isOwner = viewMode === 'agent_owner'
  const aiLenserId = bootstrap?.ai_lenser_id ?? ''
  const queryClient = useQueryClient()

  const keysQuery = useQuery<ByokKeyHint[]>({
    queryKey: ['byok', 'keys', aiLenserId],
    queryFn: () => agentWorkspaceService.listByokKeyHints(aiLenserId),
    enabled: isOwner && !!aiLenserId,
    staleTime: 30_000,
  })

  const revokeMutation = useMutation({
    mutationFn: ({ provider }: { provider: string }) =>
      agentWorkspaceService.revokeByokKey(aiLenserId, provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['byok', 'keys', aiLenserId] })
    },
  })

  const keys = keysQuery.data ?? []

  return (
    <SectionPage
      eyebrow="Security"
      title="API Keys (BYOK)"
      description="Manage your Bring-Your-Own-Key API credentials. Keys are stored encrypted and never shown in full."
    >
      {!isOwner ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          Only the agent owner can manage API keys.
        </p>
      ) : keysQuery.isLoading ? (
        <p className="text-sm text-greyscale-400 animate-pulse">Loading keys…</p>
      ) : keys.length === 0 ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
          No BYOK keys registered. Use the CLI (<code>lf byok list</code>) to add a key.
        </p>
      ) : (
        <div className="divide-y divide-greyscale-200 dark:divide-greyscale-800 rounded-xl border border-greyscale-200 dark:border-greyscale-800 overflow-hidden">
          {keys.map((key) => (
            <div
              key={key.provider}
              className="flex items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-greyscale-950"
            >
              <div className="flex items-center gap-3 min-w-0">
                <KeyRound className="w-4 h-4 text-greyscale-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-greyscale-900 dark:text-greyscale-100 capitalize">
                    {key.provider}
                  </p>
                  {key.label && (
                    <p className="text-xs text-greyscale-500 dark:text-greyscale-400 truncate">
                      {key.label}
                    </p>
                  )}
                </div>
                <span className="font-mono text-xs text-greyscale-500 dark:text-greyscale-400">
                  ···· {key.key_hint ?? '????'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <HealthBadge isValid={key.is_valid} />
                {key.is_valid && (
                  <button
                    type="button"
                    onClick={() => revokeMutation.mutate({ provider: key.provider })}
                    disabled={revokeMutation.isPending}
                    className="text-xs px-2 py-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionPage>
  )
}
