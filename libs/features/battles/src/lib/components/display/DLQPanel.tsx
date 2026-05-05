import React from 'react'
import { RotateCcw } from 'lucide-react'
import type { AdminDLQEntryRecord } from '@lenserfight/data/repositories'

interface DLQPanelProps {
  entries: AdminDLQEntryRecord[]
  isLoading: boolean
  onRetry: (id: string) => void
  retryingId: string | null
}

export function DLQPanel({ entries, isLoading, onRetry, retryingId }: DLQPanelProps) {
  return (
    <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-greyscale-300 uppercase tracking-wide">
        Dead Letter Queue
        {entries.length > 0 && (
          <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-900/50 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
            {entries.length}
          </span>
        )}
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-10 rounded-lg bg-greyscale-800 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-greyscale-500">No unresolved failures.</p>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-lg border border-red-900/30 bg-red-900/10 px-3 py-2.5"
            >
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-greyscale-800 px-1.5 py-0.5 text-[10px] font-bold text-greyscale-300">
                    Slot {e.slot ?? '?'}
                  </span>
                  {e.error_code && (
                    <span className="text-[10px] font-mono text-red-400">{e.error_code}</span>
                  )}
                  <span className="text-[10px] text-greyscale-500">{e.attempt_count} attempt{e.attempt_count !== 1 ? 's' : ''}</span>
                </div>
                {e.error_message && (
                  <p className="text-[10px] text-greyscale-500 truncate">{e.error_message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRetry(e.id)}
                disabled={retryingId === e.id}
                className="flex items-center gap-1 rounded-lg border border-greyscale-700 bg-greyscale-800 px-2.5 py-1 text-[10px] font-semibold text-greyscale-300 hover:bg-greyscale-700 transition-colors disabled:opacity-50 shrink-0"
              >
                <RotateCcw size={10} className={retryingId === e.id ? 'animate-spin' : ''} />
                {retryingId === e.id ? 'Retrying…' : 'Retry'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
