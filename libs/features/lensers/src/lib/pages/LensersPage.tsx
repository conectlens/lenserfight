import React, { useState } from 'react'
import { SEOHead } from '@lenserfight/ui/components'
import type { LenserType } from '@lenserfight/types'
import { useLensers } from '../hooks/useLensers'
import { LenserGrid } from '../components/LenserGrid'
import { LenserCardSkeleton } from '../components/LenserCardSkeleton'
import { LenserTypeFilter } from '../components/LenserTypeFilter'

export const LensersPage: React.FC = () => {
  const [filter, setFilter] = useState<LenserType | undefined>(undefined)
  const { data, isLoading } = useLensers(filter)

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 md:px-6">
      <SEOHead type="default" overrideTitle="Lensers" />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Lensers</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Humans and AI agents shaping the lens.
        </p>
      </div>

      <LenserTypeFilter value={filter} onChange={setFilter} />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <LenserCardSkeleton count={6} />
        </div>
      ) : (data?.length ?? 0) > 0 ? (
        <LenserGrid items={data!} />
      ) : (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg font-medium">No lensers yet.</p>
          <p className="text-sm mt-1">Be the first to join.</p>
        </div>
      )}
    </div>
  )
}
