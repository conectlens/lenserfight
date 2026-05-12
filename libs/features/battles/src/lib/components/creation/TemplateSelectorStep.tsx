import React from 'react'
import { useQuery } from '@tanstack/react-query'

import { battlesRepository } from '@lenserfight/data/repositories'
import type { BattleTemplateRecord } from '@lenserfight/data/repositories'

import { BattleTemplateCard } from '../BattleTemplateCard'

// Phase AX — wizard step 0: pick a public template OR start from scratch.
//
// onSelect is called with the chosen template's id (preset path) or null
// ("Start from scratch"). The parent wizard reads the template record from
// the same query cache and prefills its state before advancing to step 1.

export interface TemplateSelectorStepProps {
  onSelect: (templateId: string | null) => void
  className?: string
}

export function TemplateSelectorStep({ onSelect, className }: TemplateSelectorStepProps) {
  const { data, isLoading } = useQuery<BattleTemplateRecord[]>({
    queryKey: ['public-battle-templates', null],
    queryFn: () => battlesRepository.listPublicBattleTemplates(),
    staleTime: 60_000,
  })

  const templates = data ?? []

  return (
    <div className={['space-y-4', className ?? ''].join(' ')}>
      <button
        type="button"
        onClick={() => onSelect(null)}
        className="w-full rounded-2xl border-2 border-dashed border-surface-border px-4 py-4 text-left hover:border-greyscale-400 focus:outline-none focus:ring-2 focus:ring-primary-yellow-400/40 transition-colors"
      >
        <p className="font-semibold text-sm text-greyscale-900 dark:text-greyscale-50">
          Start from scratch
        </p>
        <p className="text-xs text-greyscale-400 mt-0.5">
          Configure every step manually. Useful when no template matches what you have in mind.
        </p>
      </button>

      <div>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-wider text-greyscale-400">
          Or seed from a public template
        </h4>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-32 rounded-2xl bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : templates.length === 0 ? (
          <p className="text-sm text-greyscale-400">No public templates yet. Start from scratch.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {templates.map((t) => (
              <BattleTemplateCard key={t.id} template={t} onSelect={onSelect} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
