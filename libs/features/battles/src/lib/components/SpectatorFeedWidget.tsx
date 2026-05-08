import { supabase } from '@lenserfight/data/supabase'
import { Card, EmptyState } from '@lenserfight/ui/components'
import { Radio } from 'lucide-react'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'


// V5 — Spectator feed widget.
//
// Subscribes to live changes on `battles.battles` and surfaces the most recent
// public battles currently in the `voting` phase. We intentionally keep the
// widget self-contained and degrade gracefully when realtime is unavailable —
// the worst-case render is the empty state, never a thrown error.
//
// Vote-count source decision:
//   The canonical write target for a battle's running vote total is the
//   `total_vote_count` column on `battles.battles` (already projected by the
//   feed RPC and used by BattleCard). The realtime UPDATE payload carries
//   that field, so we read it directly off the WebSocket frame instead of
//   joining `battles.vote_aggregates` for every tick. This matches the
//   pattern in useBattlesFeed and avoids per-tick aggregate refetches.

const MAX_ITEMS = 10

interface SpectatorBattle {
  id: string
  slug: string
  title: string
  status: string
  total_vote_count: number
  updated_at: string
}

interface RawBattleRow {
  id?: string
  slug?: string
  title?: string
  status?: string
  total_vote_count?: number
  updated_at?: string
  created_at?: string
}

function normalize(row: RawBattleRow | null | undefined): SpectatorBattle | null {
  if (!row || typeof row.id !== 'string' || typeof row.slug !== 'string') return null
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? 'Untitled battle',
    status: row.status ?? 'unknown',
    total_vote_count: typeof row.total_vote_count === 'number' ? row.total_vote_count : 0,
    updated_at: row.updated_at ?? row.created_at ?? new Date().toISOString(),
  }
}

function isLiveSpectatorBattle(b: SpectatorBattle | null): boolean {
  return !!b && b.status === 'voting'
}

interface SpectatorFeedWidgetProps {
  /**
   * Override the URL for each battle link.
   * Defaults to the in-app relative path `/battles/${slug}`.
   * Pass an absolute URL builder when embedding in a context without
   * an in-app router catch (e.g. the marketing site).
   */
  getBattleHref?: (slug: string) => string
}

export function SpectatorFeedWidget({ getBattleHref }: SpectatorFeedWidgetProps = {}) {
  const [items, setItems] = useState<SpectatorBattle[]>([])
  const itemsRef = useRef(items)
  itemsRef.current = items

  // Initial seed: pull the current snapshot of public voting battles. We
  // tolerate failure — if the snapshot fetch fails, the realtime channel
  // may still surface new entries as they arrive.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await supabase
          .schema('battles')
          .from('battles')
          .select('id, slug, title, status, total_vote_count, updated_at')
          .eq('status', 'voting')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false })
          .limit(MAX_ITEMS)
        if (cancelled) return
        if (error) return
        const seed: SpectatorBattle[] = []
        for (const row of data ?? []) {
          const n = normalize(row as RawBattleRow)
          if (n && isLiveSpectatorBattle(n)) seed.push(n)
        }
        setItems(seed)
      } catch {
        // Realtime-only fallback. Empty state will render until events arrive.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Realtime subscription. We listen on the whole table and filter in JS so
  // we can react to status transitions both INTO and OUT OF the voting phase.
  // A server-side filter on `status=eq.voting` would miss the OUT transition
  // and leave stale rows in the widget.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('spectator-feed-battles')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'battles',
            table: 'battles',
          },
          (payload) => {
            const next = normalize(payload.new as RawBattleRow | null)
            const oldRow = payload.old as RawBattleRow | null
            const removalId = oldRow?.id ?? next?.id

            setItems((current) => {
              // Remove on hard delete.
              if (payload.eventType === 'DELETE' && removalId) {
                return current.filter((b) => b.id !== removalId)
              }
              if (!next) return current

              // If the row no longer qualifies (e.g. status moved out of
              // 'voting'), drop it from the visible list.
              const candidate: SpectatorBattle = next
              if (!isLiveSpectatorBattle(candidate)) {
                return current.filter((b) => b.id !== candidate.id)
              }

              // Upsert: replace existing, otherwise prepend, then cap.
              const existingIdx = current.findIndex((b) => b.id === candidate.id)
              if (existingIdx >= 0) {
                const copy = current.slice()
                copy[existingIdx] = candidate
                return copy
              }
              return [candidate, ...current].slice(0, MAX_ITEMS)
            })
          },
        )
        .subscribe()
    } catch {
      // No-op: realtime unavailable. Snapshot above still applies.
    }

    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel)
        } catch {
          // Ignore teardown errors.
        }
      }
    }
  }, [])

  const sorted = useMemo(
    () =>
      items
        .slice()
        .sort((a, b) => (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0)),
    [items],
  )

  return (
    <Card className="overflow-hidden bg-card p-0">
      <div className="flex items-center gap-2 border-b border-surface-border bg-card/60 px-4 py-3">
        <Radio size={14} aria-hidden="true" className="text-red-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          Live battles
        </h3>
      </div>
      {sorted.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Radio}
            title="No live battles right now"
            description="Public battles in voting will show up here as they go live."
          />
        </div>
      ) : (
        <ul className="divide-y divide-surface-border">
          {sorted.map((b) => {
            const href = getBattleHref ? getBattleHref(b.slug) : `/battles/${b.slug}`
            const inner = (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{b.title}</p>
                  <p className="text-[11px] text-foreground/60">Voting</p>
                </div>
                <div
                  className="ml-2 shrink-0 rounded-full bg-foreground/5 px-2 py-0.5 font-mono text-[11px] text-foreground/70"
                  aria-label={`${b.total_vote_count} votes`}
                >
                  {b.total_vote_count} votes
                </div>
              </>
            )
            return (
              <li key={b.id}>
                {getBattleHref ? (
                  <a
                    href={href}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                  >
                    {inner}
                  </a>
                ) : (
                  <Link
                    to={href}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-foreground/5 transition-colors"
                  >
                    {inner}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
