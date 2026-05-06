import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import type { StuckBattleRecord } from '@lenserfight/data/repositories'

interface StuckBattlesPanelProps {
  battles: StuckBattleRecord[]
  isLoading: boolean
}

export function StuckBattlesPanel({ battles, isLoading }: StuckBattlesPanelProps) {
  return (
    <div className="rounded-xl border border-greyscale-800 bg-greyscale-900 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-greyscale-300 uppercase tracking-wide flex items-center gap-2">
        <AlertTriangle size={14} className="text-yellow-500" />
        Stuck Battles
        {battles.length > 0 && (
          <span className="inline-flex items-center justify-center rounded-full bg-yellow-900/50 px-1.5 py-0.5 text-[10px] font-bold text-yellow-400">
            {battles.length}
          </span>
        )}
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-greyscale-800 animate-pulse" />
          ))}
        </div>
      ) : battles.length === 0 ? (
        <p className="text-xs text-greyscale-500">No stuck battles.</p>
      ) : (
        <div className="space-y-2">
          {battles.map((b) => (
            <div key={b.id} className="flex items-center gap-3 rounded-lg border border-yellow-900/30 bg-yellow-900/10 px-3 py-2.5">
              <div className="flex-1 min-w-0">
                <Link
                  to={`/battles/${b.slug}`}
                  className="text-xs font-semibold text-yellow-300 hover:underline truncate block"
                >
                  {b.title || b.slug}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="rounded bg-greyscale-800 px-1.5 py-0.5 text-[10px] text-greyscale-400">
                    {b.status}
                  </span>
                  <span className="text-[10px] text-greyscale-500">
                    stale {Math.round(b.stale_seconds / 60)}m
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
