import { agentWorkspaceService } from '@lenserfight/data/repositories'
import type { ByokUsageRow } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'
import React from 'react'

import { SectionPage } from './SectionPage'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function truncateUuid(id: string | null): string {
  if (!id) return '—'
  return `${id.slice(0, 8)}…`
}

interface ByokUsageLogProps {
  keyId: string
}

export const ByokUsageLog: React.FC<ByokUsageLogProps> = ({ keyId }) => {
  const { data, isLoading, error } = useQuery<ByokUsageRow[]>({
    queryKey: ['byok', 'usage', keyId],
    queryFn: () => agentWorkspaceService.listByokUsage(keyId, 50),
    enabled: !!keyId,
    staleTime: 60_000,
  })

  const rows = data ?? []

  return (
    <SectionPage
      eyebrow="Security"
      docsPath="/how-to/agents/workspace/byok"
      docsTip="Last 50 model calls for this BYOK key, with provider, model, token totals, and cost estimate. Refreshes every minute."
      title="Key Usage Log"
      description="Last 50 model calls made with this BYOK key. Refreshes every minute."
    >
      {isLoading ? (
        <p className="text-sm text-greyscale-400 animate-pulse">Loading usage log…</p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load usage log.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-greyscale-500 dark:text-greyscale-400">No usage yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-greyscale-200 dark:border-greyscale-800">
                <th className="pb-2 pr-4 font-medium text-greyscale-500 dark:text-greyscale-400">Date</th>
                <th className="pb-2 pr-4 font-medium text-greyscale-500 dark:text-greyscale-400">Battle</th>
                <th className="pb-2 pr-4 font-medium text-greyscale-500 dark:text-greyscale-400">Model</th>
                <th className="pb-2 font-medium text-greyscale-500 dark:text-greyscale-400 text-right">Tokens</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-greyscale-100 dark:border-greyscale-900 last:border-0"
                >
                  <td className="py-2 pr-4 text-greyscale-700 dark:text-greyscale-300 whitespace-nowrap">
                    {formatDate(row.called_at)}
                  </td>
                  <td className="py-2 pr-4 font-mono text-greyscale-500 dark:text-greyscale-400">
                    {truncateUuid(row.battle_id)}
                  </td>
                  <td className="py-2 pr-4 text-greyscale-700 dark:text-greyscale-300">
                    {row.model_id}
                  </td>
                  <td className="py-2 text-greyscale-700 dark:text-greyscale-300 text-right tabular-nums">
                    {row.token_count.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionPage>
  )
}
