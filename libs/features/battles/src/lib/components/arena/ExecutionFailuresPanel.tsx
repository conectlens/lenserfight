import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { battlesService } from '@lenserfight/data/repositories'
import React from 'react'

interface Props {
  battleId: string
  isCreator: boolean
}

export function ExecutionFailuresPanel({ battleId, isCreator }: Props) {
  const qc = useQueryClient()

  const { data: entries = [] } = useQuery({
    queryKey: queryKeys.battles.dlq(battleId),
    queryFn: () => battlesService.getDLQEntries({ battleId, unresolvedOnly: true }),
    enabled: isCreator,
    staleTime: 30_000,
  })

  const retryMutation = useMutation({
    mutationFn: (deadLetterId: string) => battlesService.retryDLQEntry(deadLetterId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.battles.dlq(battleId) }),
  })

  if (!isCreator || entries.length === 0) return null

  return (
    <details className="mt-4 rounded-2xl border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-400">
        Execution Failures ({entries.length})
      </summary>
      <div className="divide-y divide-red-100 dark:divide-red-900">
        {entries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-xs font-medium text-greyscale-800 dark:text-greyscale-200">
                Slot {entry.slot ?? '?'} — <span className="font-mono">{entry.error_code ?? 'unknown'}</span>
              </p>
              {entry.error_message && (
                <p className="truncate text-xs text-greyscale-500 dark:text-greyscale-400">{entry.error_message}</p>
              )}
              <p className="text-xs text-greyscale-400">Attempts: {entry.attempt_count}</p>
            </div>
            <button
              className="shrink-0 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              disabled={retryMutation.isPending}
              onClick={() => retryMutation.mutate(entry.id)}
            >
              Retry
            </button>
          </div>
        ))}
      </div>
    </details>
  )
}
