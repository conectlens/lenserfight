import { lensesService } from '@lenserfight/data/repositories'
import { SEOHead } from '@lenserfight/ui/components'
import { useQuery } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { LensCard } from '../components/LensCard'
import { LensesSearchBar } from '../components/LensesSearchBar'

export function MarketplacePage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const { data: lensesEnvelope, isLoading } = useQuery({
    queryKey: ['marketplace', 'popular'],
    queryFn: () => lensesService.sort('popular', 0, 48),
    staleTime: 1000 * 60 * 5,
  })
  const lenses = lensesEnvelope?.data ?? []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return lenses
    return lenses.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        (l.description ?? '').toLowerCase().includes(q) ||
        l.tags.some((t) => t.slug?.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
    )
  }, [lenses, search])

  return (
    <>
      <SEOHead
        title="Marketplace — LenserFight"
        description="Discover and reuse public lenses created by the LenserFight community."
      />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Store size={24} className="text-amber-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Marketplace</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Public lenses from the community, ordered by popularity.
              </p>
            </div>
          </div>
          <div className="w-full sm:w-72">
            <LensesSearchBar value={search} onChange={setSearch} />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <Store size={28} className="text-gray-400" />
            <p className="text-gray-500">
              {search ? 'No lenses matched your search.' : 'No public lenses yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lens) => (
              <LensCard
                key={lens.id}
                lens={lens}
                onClick={(id) => navigate(`/lenses/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
