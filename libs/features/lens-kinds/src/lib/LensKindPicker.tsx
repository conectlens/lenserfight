import React from 'react'

import { LENS_KIND_ORDER, LENS_KIND_REGISTRY } from './lens-kinds.registry'

import type { LensKind } from '@lenserfight/types'

const BADGE_COLOR_CLASS: Record<string, string> = {
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
  rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
  violet: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-200',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
}

interface LensKindPickerProps {
  value: LensKind[] | null
  onChange: (kinds: LensKind[]) => void
  /** Optional dense layout — fewer columns, smaller cards. */
  dense?: boolean
  /** Optional description hidden when true (useful for compact contexts). */
  hideDescription?: boolean
  /** Layout variant: grid (default) or carousel */
  variant?: 'grid' | 'carousel'
  className?: string
}

/**
 * Visual picker for the nine canonical lens kinds. Controlled component —
 * the consumer owns the selection and is responsible for reflecting it in
 * `content.tag_map` via a `kind:*` tag slug (see `LENS_KIND_REGISTRY`).
 */
export const LensKindPicker: React.FC<LensKindPickerProps> = ({
  value,
  onChange,
  dense = false,
  hideDescription = false,
  variant = 'grid',
  className = '',
}) => {
  const kinds = LENS_KIND_ORDER
  const gridCols = dense ? 'grid-cols-3 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-3'

  const renderCard = (kind: LensKind, index: number) => {
    const def = LENS_KIND_REGISTRY[kind]
    const selected = value?.includes(kind) ?? false
    const badge = BADGE_COLOR_CLASS[def.badgeColor] ?? BADGE_COLOR_CLASS.slate
    return (
      <button
        key={`${kind}-${index}`}
        type="button"
        role="checkbox"
        aria-checked={selected}
        onClick={() => {
          const current = value || []
          if (current.includes(kind)) {
            onChange(current.filter((k) => k !== kind))
          } else {
            onChange([...current, kind])
          }
        }}
        className={`text-left rounded-xl border px-3 py-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 shrink-0 ${variant === 'carousel' ? 'w-64 whitespace-normal' : ''} ${
          selected
            ? 'border-primary bg-primary/5 dark:bg-primary/10'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            {def.label}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${badge}`}>
            {def.tagSlug}
          </span>
        </div>
        {!hideDescription && (
          <div className="text-xs text-gray-500 dark:text-gray-400 leading-snug">
            {def.description}
          </div>
        )}
      </button>
    )
  }

  if (variant === 'carousel') {
    return (
      <div className={className}>
        <div className="mb-2 text-[13px] font-semibold text-greyscale-500 dark:text-greyscale-400 ml-1">
          Engine Kind
        </div>
        <style>{`
          @keyframes scroll-carousel {
            0% { transform: translate3d(0, 0, 0); }
            100% { transform: translate3d(calc(-50% - 0.5rem), 0, 0); }
          }
          .animate-carousel {
            animation: scroll-carousel 30s linear infinite;
            will-change: transform;
          }
          .group:hover .animate-carousel {
            animation-play-state: paused;
          }
        `}</style>
        <div className="overflow-hidden w-full group relative" role="group" aria-label="Lens kind">
           {/* Fade masks for the carousel edges */}
           <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface-raised dark:from-surface-raised z-10 pointer-events-none" />
           <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-raised dark:from-surface-raised z-10 pointer-events-none" />
           
           <div className="flex gap-4 animate-carousel w-max">
             {kinds.map((kind) => renderCard(kind, 0))}
             {kinds.map((kind) => renderCard(kind, 1))}
           </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="mb-2 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        Lens Kind
      </div>
      <div role="group" aria-label="Lens kind" className={`grid gap-2 ${gridCols}`}>
        {kinds.map((kind) => renderCard(kind, 0))}
      </div>
    </div>
  )
}
