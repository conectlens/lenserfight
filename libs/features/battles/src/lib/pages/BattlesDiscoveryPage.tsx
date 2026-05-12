// Phase BP — public, paginated battle discovery page.
//
// Anonymous-safe. Uses fn_browse_battles via the repository with
// useInfiniteQuery for keyset pagination on (created_at DESC, id DESC).

import { battlesRepository, seoService, type BrowseBattleRecord } from '@lenserfight/data/repositories'
import { Button } from '@lenserfight/ui/components'
import { Input } from '@lenserfight/ui/forms'
import { PageMeta } from '@lenserfight/ui/layout'
import { useInfiniteQuery } from '@tanstack/react-query'
import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const PAGE_SIZE = 20

const CATEGORIES = ['creative', 'technical', 'business', 'gaming'] as const
const STATUSES = ['open', 'voting', 'scoring', 'published'] as const

export function BattlesDiscoveryPage() {
  const [q, setQ] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteQuery<BrowseBattleRecord[]>({
    queryKey: ['battles', 'browse', { q, category, status }],
    queryFn: ({ pageParam }) => {
      const cursor = pageParam as { created_at: string; id: string } | undefined
      return battlesRepository.browseBattles(
        { q: q || null, category, status },
        cursor,
        PAGE_SIZE,
      )
    },
    initialPageParam: undefined,
    getNextPageParam: (last) => {
      if (!last || last.length < PAGE_SIZE) return undefined
      const tail = last[last.length - 1]
      return tail ? { created_at: tail.created_at, id: tail.id } : undefined
    },
    staleTime: 30_000,
  })

  const rows = data?.pages.flat() ?? []
  const battlesMeta = seoService.getBattlesListMeta()

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <PageMeta title={battlesMeta.title} description={battlesMeta.description} />
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-surface-text">Battles</h1>
        <p className="text-sm text-surface-text-muted">
          Browse open battles. Filter by category, status, or search by title.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search battle title…"
          className="flex-1 min-w-[12rem]"
        />
        <select
          value={category ?? ''}
          onChange={(e) => setCategory(e.target.value || null)}
          aria-label="Filter by category"
          className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || null)}
          aria-label="Filter by status"
          className="rounded-lg border border-surface-border bg-surface-base px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <p className="text-sm text-surface-text-muted">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center">
          <p className="text-sm text-surface-text-muted">No battles match your filters yet.</p>
          <div className="mt-3">
            <Link to="/battles/create">
              <Button size="sm">Create the first battle</Button>
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-surface-border bg-surface-raised p-4 hover:bg-surface-interactive transition-colors"
            >
              <Link to={`/battles/${b.slug}`} className="block space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-surface-text truncate">{b.title}</h2>
                  <span className="text-xs uppercase tracking-wider text-surface-text-muted">
                    {b.status}
                  </span>
                </div>
                <p className="text-xs text-surface-text-muted">
                  {b.category ?? 'uncategorised'} • {b.contender_count} contenders • {b.vote_count} votes
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetching}
            isLoading={isFetching}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
