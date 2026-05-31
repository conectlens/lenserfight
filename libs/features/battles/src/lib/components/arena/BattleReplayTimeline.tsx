import React, { useEffect, useState } from 'react'

interface StreamEvent {
  ts: number
  text: string
  tokenCount?: number
}

interface ReplayContender {
  id: string
  name: string
  streamEvents?: StreamEvent[]
}

interface BattleReplayTimelineProps {
  battleId: string
  contenders: ReplayContender[]
}

export function BattleReplayTimeline({ contenders }: BattleReplayTimelineProps) {
  const [position, setPosition] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState<1 | 2>(1)

  const hasEvents = contenders.some((c) => (c.streamEvents?.length ?? 0) > 0)

  const totalDurationMs = hasEvents
    ? Math.max(
        ...contenders.flatMap((c) => c.streamEvents?.map((e) => e.ts) ?? [0]),
        60000
      )
    : 60000

  const currentMs = (position / 100) * totalDurationMs

  const maxTokens = Math.max(
    ...contenders.map((c) =>
      c.streamEvents?.reduce((sum, e) => sum + (e.tokenCount ?? 0), 0) ?? 0
    ),
    1
  )

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setPosition((p) => {
        if (p >= 100) {
          setIsPlaying(false)
          return 100
        }
        return Math.min(100, p + speed * 0.5)
      })
    }, 100)
    return () => clearInterval(id)
  }, [isPlaying, speed])

  if (!hasEvents) {
    return (
      <div className="rounded-lg border border-surface-border bg-card p-6 text-center text-sm text-foreground/60">
        No replay data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Side-by-side contender output */}
      <div className="flex gap-4">
        {contenders.map((contender) => {
          const visibleText = (contender.streamEvents ?? [])
            .filter((e) => e.ts <= currentMs)
            .map((e) => e.text)
            .join('')

          const tokensUsed = (contender.streamEvents ?? [])
            .filter((e) => e.ts <= currentMs)
            .reduce((sum, e) => sum + (e.tokenCount ?? 0), 0)

          const tokenPct = Math.min(100, (tokensUsed / maxTokens) * 100)

          return (
            <div key={contender.id} className="flex-1 min-w-0 space-y-2">
              <p className="text-xs font-semibold text-foreground truncate">{contender.name}</p>
              <div className="h-48 overflow-y-auto text-sm font-mono bg-muted rounded p-2 whitespace-pre-wrap break-words">
                {visibleText || <span className="text-foreground/40">—</span>}
              </div>
              {/* Token progress bar */}
              <div className="w-full h-1.5 bg-muted rounded overflow-hidden">
                <div
                  className="h-full rounded bg-primary-yellow-500 transition-all duration-100"
                  style={{ width: `${tokenPct}%` }}
                />
              </div>
              <p className="text-[10px] text-foreground/50 tabular-nums">{tokensUsed} tokens</p>
            </div>
          )
        })}
      </div>

      {/* Scrub slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={position}
        onChange={(e) => {
          setIsPlaying(false)
          setPosition(Number(e.target.value))
        }}
        className="w-full accent-primary-yellow-500"
        aria-label="Scrub replay position"
      />

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPlaying((p) => !p)}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors"
        >
          {isPlaying ? '⏸' : '▶'}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => setSpeed((s) => (s === 1 ? 2 : 1))}
          className="rounded-lg border border-surface-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-surface-raised transition-colors"
        >
          {speed}×
        </button>
        <span className="ml-auto text-xs text-foreground/50 tabular-nums">
          {position.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}
