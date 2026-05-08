import { queryKeys } from '@lenserfight/data/cache'
import { supabase } from '@lenserfight/data/supabase'
import { Card, EmptyState, PageHeader } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Film } from 'lucide-react'
import React from 'react'
import { useParams } from 'react-router-dom'


import { BattleReplayTimeline } from '../components/replay/BattleReplayTimeline'

// V2 — Battle replay page.
//
// Resolves the battle slug to an id and renders the chronological replay
// timeline. Slug-to-id is purposely a thin local query — the timeline hook
// only needs the id, so we avoid pulling the full battle detail payload.
export function BattleReplayPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, error } = useQuery<{ id: string; title: string } | null, Error>({
    queryKey: [...queryKeys.battles.all, 'replay-slug-resolve', slug ?? ''],
    enabled: !!slug,
    staleTime: 1000 * 60 * 5,
    queryFn: async () => {
      if (!slug) return null
      const { data: row, error: lookupError } = await supabase
        .schema('battles')
        .from('battles')
        .select('id, title')
        .eq('slug', slug)
        .single()
      if (lookupError) throw new Error(lookupError.message)
      return row ? { id: row.id as string, title: (row.title as string) ?? slug } : null
    },
  })

  if (!slug) {
    return (
      <EmptyState
        icon={Film}
        title="Replay unavailable"
        description="No battle slug was provided in the URL."
      />
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <PageHeader title="Replay" description="Loading battle replay..." />
        <Card className="h-32 animate-pulse border border-surface-border bg-card">
          <span className="sr-only">Loading replay timeline...</span>
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={Film}
        title="Replay unavailable"
        description={error?.message ?? "We couldn't find this battle."}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Replay: ${data.title}`}
        description="Chronological replay of contender execution events."
      />
      <BattleReplayTimeline battleId={data.id} />
    </div>
  )
}
