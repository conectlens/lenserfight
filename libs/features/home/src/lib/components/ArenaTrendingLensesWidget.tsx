import { Card, EmptyState } from '@lenserfight/ui/components'
import { Sparkles } from 'lucide-react'
import React from 'react'

import { ArenaLensCard } from '@lenserfight/features/lenses'
import { useTrendingPrompts } from '../useThreads'

const DISPLAY_COUNT = 4

const SkeletonCard = () => (
  <div className="h-28 rounded-2xl bg-surface-raised animate-pulse" aria-hidden="true" />
)

interface ArenaTrendingLensesWidgetProps {
  /** Base URL for lens links (e.g. 'https://moon.lenserfight.com'). Empty string for in-app routing. */
  baseUrl?: string
  title?: string
  emptyTitle?: string
  emptyDescription?: string
}

export function ArenaTrendingLensesWidget({
  baseUrl = '',
  title = 'Trending Lenses',
  emptyTitle = 'No trending lenses yet',
  emptyDescription = 'The most-used lenses will appear here as the community creates.',
}: ArenaTrendingLensesWidgetProps) {
  const { data, isLoading } = useTrendingPrompts()
  const lenses = (data?.pages.flatMap((p) => p.data ?? []) ?? [])
    .slice(0, DISPLAY_COUNT)
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-surface-border bg-card/60 px-4 py-3">
        <Sparkles size={14} aria-hidden="true" className="text-violet-500" />
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground/70">
          {title}
        </h3>
      </div>

      <div className="p-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2" aria-label="Loading trending lenses">
            {Array.from({ length: DISPLAY_COUNT }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : lenses.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {lenses.map((lens) => (
              <ArenaLensCard
                key={lens.id}
                href={`${baseUrl}/lenses/${lens.id}`}
                id={lens.id}
                title={lens.title}
                description={lens.description}
                usageCount={lens.usageCount}
                outputKind={lens.outputKind}
                authorDisplayName={lens.author?.displayName}
                authorHandle={lens.author?.handle}
                authorAvatarUrl={lens.author?.avatarUrl}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
