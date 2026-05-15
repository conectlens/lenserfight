import { XCarousel } from '@lenserfight/ui/components'
import { Sparkles } from 'lucide-react'
import React from 'react'

interface WorkflowTemplate {
  id: string
  title: string
  description?: string | null
  node_count: number
  kinds: string[]
}

interface WorkflowTemplateCarouselProps {
  templates: WorkflowTemplate[]
  isLoading: boolean
  isForking: boolean
  onFork: (id: string) => void
}

export const WorkflowTemplateCarousel: React.FC<WorkflowTemplateCarouselProps> = ({
  templates,
  isLoading,
  isForking,
  onFork,
}) => {
  if (!isLoading && templates.length === 0) return null

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-greyscale-500 dark:text-greyscale-400">
          <Sparkles size={13} className="text-primary-yellow-500" />
          Start from template
        </div>
        <span className="text-[11px] text-greyscale-400 font-medium">
          Forks into your workspace so you can edit safely.
        </span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 overflow-hidden pb-2 -mx-1 px-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-64 h-32 rounded-2xl border border-surface-border bg-surface-raised animate-pulse"
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
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={isForking}
              onClick={() => onFork(t.id)}
              className="group/item flex-shrink-0 w-64 rounded-2xl border border-surface-border bg-surface-base p-4 text-left hover:border-primary-yellow-500/40 hover:bg-primary-yellow-500/5 transition-all duration-300 disabled:opacity-60 disabled:cursor-wait"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[13px] font-bold text-greyscale-900 dark:text-greyscale-50 leading-tight line-clamp-2 group-hover/item:text-primary-yellow-600 dark:group-hover/item:text-primary-yellow-400 transition-colors">
                  {t.title.replace(/^Template · /, '')}
                </p>
                <span className="text-[10px] font-bold text-greyscale-400 whitespace-nowrap bg-surface-sunken px-1.5 py-0.5 rounded-md">
                  {t.node_count} steps
                </span>
              </div>
              {t.description && (
                <p className="text-[11px] leading-relaxed text-greyscale-500 line-clamp-2 mb-3 h-8">
                  {t.description}
                </p>
              )}
              <div className="flex flex-wrap gap-1">
                {t.kinds.slice(0, 3).map((k) => (
                  <span
                    key={k}
                    className="text-[9px] font-bold rounded-lg bg-surface-raised text-greyscale-500 px-2 py-0.5 border border-surface-border/50 uppercase tracking-tighter"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </XCarousel>
      )}
    </section>
  )
}
