import React from 'react'
import { ArrowRight, Layers, Pencil, Users } from 'lucide-react'
import { Badge, Button } from '@lenserfight/ui/components'
import type { BattleTemplateRecord } from '@lenserfight/data/repositories'

// Phase AW — single card in the public battle template gallery.
// Renders title, description (trimmed), category tag (colour-coded), and a
// `max_contenders` badge. A "Start battle →" action invokes onSelect.
// Phase BD — owners get an "Edit" pencil icon via onEdit.

export interface BattleTemplateCardProps {
  template: BattleTemplateRecord
  onSelect?: (id: string) => void
  onEdit?: (id: string) => void
  /** Phase BH: opt-in "Start as Series" action. */
  onStartSeries?: (id: string) => void
  className?: string
}

const CATEGORY_STYLE: Record<string, string> = {
  creative: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
  technical: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  business: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  gaming: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
}

function formatCategoryLabel(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1)
}

export function BattleTemplateCard({ template, onSelect, onEdit, onStartSeries, className }: BattleTemplateCardProps) {
  const category = template.category ?? null
  const tagClass = category && CATEGORY_STYLE[category] ? CATEGORY_STYLE[category] : 'bg-greyscale-100 text-greyscale-700 dark:bg-greyscale-800 dark:text-greyscale-200'

  return (
    <div
      data-testid="battle-template-card"
      className={[
        'flex flex-col gap-3 rounded-2xl border border-surface-border bg-surface-raised p-4',
        className ?? '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-greyscale-400">
          <Layers size={16} />
          <span className="text-xs font-semibold uppercase tracking-wide">Template</span>
        </div>
        {category && (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${tagClass}`}>
            {formatCategoryLabel(category)}
          </span>
        )}
      </div>

      <div>
        <h3 className="text-base font-semibold text-greyscale-900 dark:text-greyscale-50 line-clamp-2">
          {template.title}
        </h3>
        {template.description && (
          <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400 line-clamp-3">
            {template.description}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge color="gray" size="sm">
          <Users size={12} className="mr-1" />
          {template.max_contenders} contenders
        </Badge>
        <div className="flex items-center gap-1">
          {onEdit && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onEdit(template.id)}
              aria-label={`Edit ${template.title}`}
            >
              <Pencil size={14} />
            </Button>
          )}
          {onStartSeries && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onStartSeries(template.id)}
              aria-label={`Start a series from ${template.title}`}
            >
              Start series
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onSelect?.(template.id)}
            aria-label={`Start a battle from ${template.title}`}
          >
            Start battle <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    </div>
  )
}
