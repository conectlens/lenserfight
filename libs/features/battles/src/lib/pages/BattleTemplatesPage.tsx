import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import { Button, EmptyState, ExperimentalBadge, PageHeader, SEOHead } from '@lenserfight/ui/components'
import { Plus } from 'lucide-react'

import { BattleTemplateCard } from '../components/BattleTemplateCard'

// Phase AW — public battle template gallery.
// Anyone (anon or authenticated) can browse public templates. Selecting one
// jumps to the create wizard with ?template=<id> so the wizard pre-fills.

const CATEGORY_OPTIONS: { value: string | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'creative', label: 'Creative' },
  { value: 'technical', label: 'Technical' },
  { value: 'business', label: 'Business' },
  { value: 'gaming', label: 'Gaming' },
]

export function BattleTemplatesPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [category, setCategory] = useState<string | null>(null)

  const { data, isLoading } = useQuery<BattleTemplateRecord[]>({
    queryKey: ['public-battle-templates', category],
    queryFn: () => battlesRepository.listPublicBattleTemplates(category ?? undefined),
    staleTime: 60_000,
  })

  const templates = data ?? []

  const grouped = useMemo(() => templates, [templates])

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <SEOHead type="battles-list" overrideTitle="Battle Templates — LenserFight" />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title={<span className="inline-flex items-center gap-2">Battle Templates <ExperimentalBadge mode="inline" title="Experimental" /></span>}
          description="Start from a community-tested template, or use one as the seed for a new battle."
        />
        {isAuthenticated && (
          <Button size="sm" onClick={() => navigate('/battles/templates/new')}>
            <Plus size={14} className="mr-1" />
            Create Template
          </Button>
        )}
      </div>

      <ExperimentalBadge
        title="Battle templates"
        description="Templates work but I'm still ironing out edge cases. Try them, fork them, and tell me what feels rough — that's how this becomes solid."
        className="mt-3"
      />

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Category filter">
        {CATEGORY_OPTIONS.map((opt) => {
          const active = (opt.value ?? null) === (category ?? null)
          return (
            <button
              key={opt.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(opt.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                active
                  ? 'border-primary-yellow-500 bg-primary-yellow-500/10 text-primary-yellow-700 dark:text-primary-yellow-300'
                  : 'border-surface-border text-greyscale-500 hover:border-greyscale-400 dark:text-greyscale-400'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="templates-loading">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-surface-raised animate-pulse"
                aria-hidden="true"
              />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            title="No public templates yet."
            description="Check back soon — featured battle templates land here as the community publishes them."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped.map((t) => (
              <BattleTemplateCard
                key={t.id}
                template={t}
                onSelect={(id) => navigate(`/battles/new?template=${id}`)}
                onEdit={
                  user?.id && t.creator_lenser_id === user.id
                    ? (id) => navigate(`/battles/templates/${id}/edit`)
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default BattleTemplatesPage
