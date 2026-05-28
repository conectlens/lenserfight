import { Card, EmptyState } from '@lenserfight/ui/components'
import { Clock, Film } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { useBattleReplayEvents } from '../../hooks/query/useBattleReplayEvents'

import type { BattleReplayEvent } from '../../hooks/query/useBattleReplayEvents'

interface BattleReplayTimelineProps {
  battleId: string
}

// V2 — Battle replay timeline.
//
// Renders an interleaved chronological list of `lenses.workflow_run_events`
// for both contender runs. The user can scrub via the slider or arrow keys
// (← / → step ±1). The "current" position is drawn as a highlight band; all
// events up to and including the cursor are emphasised, later events are
// dimmed. We deliberately do NOT auto-play — autoplay belongs in a separate
// `useReplayController` integration when product asks for it.
function formatTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function payloadPreview(payload: Record<string, unknown>): string {
  try {
    const s = JSON.stringify(payload)
    if (!s || s === '{}') return ''
    return s.length > 160 ? `${s.slice(0, 160)}…` : s
  } catch {
    return ''
  }
}

function ContenderBadge({ label }: { label: 'A' | 'B' }) {
  const tone =
    label === 'A'
      ? 'bg-primary-yellow-100 text-primary-yellow-900 dark:bg-primary-yellow-900/40 dark:text-primary-yellow-200'
      : 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-200'
  return (
    <span className={`inline-flex items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
      {label}
    </span>
  )
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-surface-border bg-card px-1.5 py-0.5 text-[10px] font-medium text-foreground/70">
      {kind}
    </span>
  )
}

function EventRow({
  event,
  active,
  faded,
}: {
  event: BattleReplayEvent
  active: boolean
  faded: boolean
}) {
  const preview = payloadPreview(event.payload)
  return (
    <li
      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
        active
          ? 'border-primary-yellow-500/60 bg-primary-yellow-50/60 dark:bg-primary-yellow-900/10'
          : 'border-surface-border bg-card'
      } ${faded ? 'opacity-40' : 'opacity-100'}`}
    >
      <div className="flex flex-col items-center gap-1 pt-0.5">
        <ContenderBadge label={event.contender_label} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs text-foreground/70">
          <Clock size={12} aria-hidden="true" />
          <span className="font-mono">{formatTime(event.occurred_at)}</span>
          <KindBadge kind={event.kind} />
        </div>
        {preview && (
          <p className="mt-1 break-words font-mono text-xs text-foreground/80">
            {preview}
          </p>
        )}
      </div>
    </li>
  )
}

export function BattleReplayTimeline({ battleId }: BattleReplayTimelineProps) {
  const { events, loading, error } = useBattleReplayEvents(battleId)
  const [cursor, setCursor] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Reset cursor whenever the underlying event list grows or shrinks so we
  // never index past the current data.
  const total = events.length
  useEffect(() => {
    if (cursor >= total) setCursor(Math.max(0, total - 1))
  }, [cursor, total])

  // Keyboard scrubbing — only when the timeline is focused. We bind to the
  // wrapping div instead of window to avoid hijacking arrow keys globally.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (total === 0) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      setCursor((c) => Math.min(total - 1, c + 1))
    }
  }

  const currentEvent = events[cursor]
  const sliderMax = Math.max(0, total - 1)

  const visibleEvents = useMemo(() => events, [events])

  if (loading) {
    return (
      <Card className="space-y-3 border border-surface-border bg-card p-6">
        <div className="h-4 w-32 animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-full animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-foreground/10" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-foreground/10" />
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border border-surface-border bg-card p-6 text-sm text-red-500">
        Failed to load replay events: {error.message}
      </Card>
    )
  }

  if (total === 0) {
    return (
      <EmptyState
        icon={Film}
        title="No replay events yet"
        description="Both contender runs are empty — once execution events are recorded, they will appear here in chronological order."
      />
    )
  }

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      role="region"
      aria-label="Battle replay timeline"
      className="space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 rounded-xl"
    >
      <Card className="border border-surface-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between text-xs text-foreground/70">
          <div className="flex items-center gap-2">
            <Film size={14} aria-hidden="true" />
            <span className="font-semibold text-foreground">Replay timeline</span>
          </div>
          <span className="font-mono">
            {total === 0 ? '0 / 0' : `${cursor + 1} / ${total}`}
          </span>
        </div>

        <input
          type="range"
          min={0}
          max={sliderMax}
          step={1}
          value={cursor}
          onChange={(e) => setCursor(Number(e.target.value))}
          aria-label="Scrub replay timeline"
          className="w-full accent-primary-yellow-500"
        />

        {currentEvent && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-foreground/70">
            <ContenderBadge label={currentEvent.contender_label} />
            <span className="font-mono">{formatTime(currentEvent.occurred_at)}</span>
            <KindBadge kind={currentEvent.kind} />
          </div>
        )}

        <p className="mt-2 text-[11px] text-foreground/50">
          Use ← / → to step one event at a time.
        </p>
      </Card>

      <ol className="space-y-2">
        {visibleEvents.map((evt, idx) => (
          <EventRow
            key={evt.id}
            event={evt}
            active={idx === cursor}
            faded={idx > cursor}
          />
        ))}
      </ol>
    </div>
  )
}
