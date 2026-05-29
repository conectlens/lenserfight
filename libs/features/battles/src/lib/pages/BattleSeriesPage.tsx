import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, Trophy } from 'lucide-react'
import React, { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { battlesRepository, seoService } from '@lenserfight/data/repositories'
import type { SeriesRoundRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { useShareContext } from '@lenserfight/features/share'
import { Button, EmptyState, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { SeriesAdvanceButton } from '../components/series/SeriesAdvanceButton'

// Phase BH — bracket-style view for a battle series. Owner sees an
// "Advance Series" button when the current round battle is closed.

export function BattleSeriesPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { setShareConfig } = useShareContext()

  const { data: rounds = [], isLoading } = useQuery<SeriesRoundRecord[]>({
    queryKey: ['battle-series', id],
    queryFn: () => (id ? battlesRepository.getSeries(id) : Promise.resolve([])),
    enabled: Boolean(id),
    staleTime: 15_000,
  })

  const advance = useMutation({
    mutationFn: () => battlesRepository.advanceSeries(id as string),
    onSuccess: () => {
      toast.success('Series advanced')
      qc.invalidateQueries({ queryKey: ['battle-series', id] })
    },
    onError: (err: Error) => toast.error(err.message),
  })

  useEffect(() => {
    if (rounds.length > 0) {
      const head = rounds[0]
      setShareConfig({
        title: head.title,
        resourceType: 'series',
        resourceId: id ?? '',
      })
    }
    return () => setShareConfig(null)
  }, [rounds, id, setShareConfig])

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="h-40 rounded-2xl bg-surface-raised animate-pulse" />
      </div>
    )
  }

  if (!rounds.length) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-6">
        <EmptyState
          title="Series not found."
          description="The series does not exist, has been deleted, or contains no published battles you can access."
        />
      </div>
    )
  }

  const head = rounds[0]
  const isOwner = user?.id && head.creator_lenser_id === user.id
  const currentRound = rounds.find((r) => r.round_number === head.current_round)
  const canAdvance =
    isOwner &&
    head.status === 'active' &&
    currentRound?.battle_status === 'closed'

  const seriesMeta = seoService.getBattleSeriesMeta(head.title, head.round_count, id)

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <SEOHead title={seriesMeta.title} description={seriesMeta.description} />
      <PageHeader
        title={head.title}
        description={
          head.status === 'complete'
            ? 'Series complete.'
            : `Round ${head.current_round} of ${head.round_count}`
        }
      />

      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-greyscale-400">
          {head.status === 'complete' ? (
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <Trophy size={14} /> Complete
            </span>
          ) : (
            <span>
              {rounds.filter((r) => r.battle_status === 'published').length} of {head.round_count} published
            </span>
          )}
        </div>
        <SeriesAdvanceButton
          canAdvance={!!canAdvance}
          isPending={advance.isPending}
          onAdvance={() => advance.mutate()}
        />
      </div>

      <ol className="mt-6 space-y-2">
        {rounds.map((r) => (
          <li
            key={r.round_number}
            className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-base px-4 py-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-yellow-500/15 text-sm font-semibold text-primary-yellow-300">
              {r.round_number}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-greyscale-100">Round {r.round_number}</span>
                {r.battle_status && (
                  <span className="text-xs rounded-full bg-surface-sunken px-2 py-0.5 text-greyscale-300">
                    {r.battle_status}
                  </span>
                )}
                {r.winner_contender_id && (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs">
                    <CheckCircle2 size={12} /> winner declared
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-greyscale-500">
                {r.battle_slug ? `/battles/${r.battle_slug}` : `Battle ${r.battle_id.slice(0, 8)}`}
              </div>
            </div>
            {r.battle_slug && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => navigate(`/battles/${r.battle_slug}`)}
                aria-label={`Open round ${r.round_number}`}
              >
                Open <ChevronRight size={14} className="ml-1" />
              </Button>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default BattleSeriesPage
