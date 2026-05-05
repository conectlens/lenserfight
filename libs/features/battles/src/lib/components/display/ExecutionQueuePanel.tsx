import React from 'react'
import type { PublicExecutionJobRecord } from '@lenserfight/data/repositories'

interface ExecutionQueuePanelProps {
  jobs: PublicExecutionJobRecord[]
  isLoading: boolean
}

const STATUS_COLORS: Record<string, string> = {
  queued:    'bg-greyscale-800 text-greyscale-400',
  claimed:   'bg-blue-900/40 text-blue-400',
  running:   'bg-yellow-900/40 text-yellow-400',
  completed: 'bg-emerald-900/40 text-emerald-400',
  failed:    'bg-red-900/40 text-red-400',
}

export function ExecutionQueuePanel({ jobs, isLoading }: ExecutionQueuePanelProps) {
  return (
    <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-greyscale-300 uppercase tracking-wide">Execution Queue</h3>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-greyscale-800 animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <p className="text-xs text-greyscale-500">No execution jobs.</p>
      ) : (
        <table className="w-full text-xs text-greyscale-300">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-greyscale-500 border-b border-greyscale-800">
              <th className="text-left py-1.5 pr-3">Battle</th>
              <th className="text-left py-1.5 pr-3">Slot</th>
              <th className="text-left py-1.5 pr-3">Status</th>
              <th className="text-right py-1.5">Retries</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-800/50">
            {jobs.map((j) => (
              <tr key={j.id}>
                <td className="py-2 pr-3 font-mono text-greyscale-500 truncate max-w-[100px]">
                  {j.battle_id.slice(0, 8)}…
                </td>
                <td className="py-2 pr-3">
                  <span className="rounded bg-greyscale-800 px-1.5 py-0.5 text-[10px] font-bold">
                    {j.slot}
                  </span>
                </td>
                <td className="py-2 pr-3">
                  <span className={['inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_COLORS[j.status] ?? ''].join(' ')}>
                    {j.status}
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{j.retry_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
