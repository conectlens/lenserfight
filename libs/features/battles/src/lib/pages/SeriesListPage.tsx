import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Trophy } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { SeriesListRecord } from '@lenserfight/data/repositories'
import { Button, EmptyState, PageHeader, SEOHead } from '@lenserfight/ui/components'

export function SeriesListPage() {
  const navigate = useNavigate()
  const { data: series = [], isLoading } = useQuery<SeriesListRecord[]>({
    queryKey: ['battle-series-list', 24, 0],
    queryFn: () => battlesRepository.listSeries(24, 0),
    staleTime: 30_000,
  })

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6">
      <SEOHead title="Battle Series" description="Browse multi-round LenserFight battle series." />
      <PageHeader
        title="Battle Series"
        description="Multi-round battles with current round progress and published results."
      />

      {isLoading ? (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-lg bg-surface-raised" />
          ))}
        </div>
      ) : series.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            icon={Trophy}
            title="No series yet."
            description="Series will appear here after templates start producing multi-round battles."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {series.map((item) => (
            <article
              key={item.series_id}
              className="rounded-lg border border-surface-border bg-surface-base p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-surface-text">{item.title}</h2>
                  <p className="mt-1 text-xs text-greyscale-500">
                    Round {item.current_round} of {item.round_count} · {item.status}
                  </p>
                </div>
                <span className="rounded-full bg-surface-raised px-2 py-0.5 text-[10px] font-semibold text-greyscale-500">
                  {item.current_battle_status ?? 'pending'}
                </span>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => navigate(`/series/${item.series_id}`)}>
                  Open <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

export default SeriesListPage
