import { XCarousel } from '@lenserfight/ui/components'
import type { BattleTemplateRecord } from '@lenserfight/data/repositories'
import { Layers } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

interface BattleTemplateCarouselProps {
  templates: BattleTemplateRecord[]
  isLoading: boolean
}

const CATEGORY_STYLE: Record<string, string> = {
  creative: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  business: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  gaming: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
}

export const BattleTemplateCarousel: React.FC<BattleTemplateCarouselProps> = ({
  templates,
  isLoading,
}) => {
  const navigate = useNavigate()

  if (!isLoading && templates.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-greyscale-500 dark:text-greyscale-400">
          <Layers size={13} className="text-primary-yellow-500" />
          Start from template
        </div>
        <span className="text-[11px] text-greyscale-400 font-medium">
          Pick a template to pre-fill the wizard.
        </span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden pb-2 -mx-1 px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-56 h-28 rounded-2xl border border-surface-border bg-surface-raised animate-pulse"
            />
          ))}
        </div>
      ) : (
        <XCarousel
          speed={40}
          gapClass="gap-3"
          gapPx={12}
          showFadeMasks
          className="pb-2"
        >
          {templates.map((t) => {
            const category = t.category ?? null
            const tagClass =
              category && CATEGORY_STYLE[category]
                ? CATEGORY_STYLE[category]
                : 'bg-greyscale-100 text-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-200'

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => navigate(`/battles/create?template=${t.id}`)}
                className="group/item flex-shrink-0 w-56 rounded-2xl border border-surface-border bg-surface-base p-4 text-left hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-[13px] font-bold text-greyscale-900 dark:text-greyscale-50 leading-tight line-clamp-2 group-hover/item:text-primary-yellow-600 dark:group-hover/item:text-primary-yellow-400 transition-colors">
                    {t.title}
                  </p>
                  {category && (
                    <span className={`flex-shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${tagClass}`}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-[11px] leading-relaxed text-greyscale-500 line-clamp-2 mb-2 h-8">
                    {t.description}
                  </p>
                )}
                <span className="text-[10px] font-bold text-greyscale-400 bg-surface-sunken px-1.5 py-0.5 rounded-md">
                  {t.max_contenders} contenders
                </span>
              </button>
            )
          })}
        </XCarousel>
      )}
    </section>
  )
}
