import React from 'react'
import type { WorkerHealthRecord } from '@lenserfight/data/repositories'

interface WorkerHealthPanelProps {
  workers: WorkerHealthRecord[]
  isLoading: boolean
}

export function WorkerHealthPanel({ workers, isLoading }: WorkerHealthPanelProps) {
  return (
    <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-greyscale-300 uppercase tracking-wide">Worker Health</h3>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-greyscale-800 animate-pulse" />
          ))}
        </div>
      ) : workers.length === 0 ? (
        <p className="text-xs text-greyscale-500">No workers registered.</p>
      ) : (
        <table className="w-full text-xs text-greyscale-300">
          <thead>
            <tr className="text-[10px] uppercase tracking-wider text-greyscale-500 border-b border-greyscale-800">
              <th className="text-left py-1.5 pr-3">Worker ID</th>
              <th className="text-left py-1.5 pr-3">Type</th>
              <th className="text-left py-1.5 pr-3">Last Seen</th>
              <th className="text-right py-1.5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-greyscale-800/50">
            {workers.map((w) => (
              <tr key={w.worker_id}>
                <td className="py-2 pr-3 font-mono truncate max-w-[120px]">{w.worker_id.slice(0, 12)}…</td>
                <td className="py-2 pr-3">{w.worker_type}</td>
                <td className="py-2 pr-3 text-greyscale-500">{w.seconds_since.toFixed(0)}s ago</td>
                <td className="py-2 text-right">
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      w.is_healthy
                        ? 'bg-emerald-900/40 text-emerald-400'
                        : 'bg-red-900/40 text-red-400',
                    ].join(' ')}
                  >
                    <span className={['w-1.5 h-1.5 rounded-full', w.is_healthy ? 'bg-emerald-400' : 'bg-red-400'].join(' ')} />
                    {w.is_healthy ? 'Healthy' : 'Dead'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
