import React from 'react'
import { FlaskConical, ExternalLink } from 'lucide-react'

export type ExperimentalBadgeMode = 'block' | 'inline'

export interface ExperimentalBadgeProps {
  /**
   * `block`  — full callout with title + description (default). Use it once at
   *            the top of an experimental page or above an experimental section.
   * `inline` — small pill suitable for headings, tabs, table cells, or nav items.
   */
  mode?: ExperimentalBadgeMode
  /** Title shown on the badge. Defaults to "Experimental". */
  title?: string
  /**
   * Description for the block mode (ignored in inline mode where it becomes a tooltip).
   * Keep it ≤ 220 chars: it sits next to a heading.
   */
  description?: string
  /** Optional permalink (issue, RFC, roadmap). Renders a "Track progress" link. */
  trackingUrl?: string
  trackingLabel?: string
  className?: string
}

/**
 * ExperimentalBadge
 *
 * Visual marker for features that are wired up but not yet hardened by tests
 * or polish passes. Designed so users feel invited to try the feature while
 * understanding that rough edges are expected.
 */
export const ExperimentalBadge = React.forwardRef<HTMLDivElement, ExperimentalBadgeProps>(
  function ExperimentalBadge(
    {
      mode = 'block',
      title = 'Experimental',
      description = "This area is under active construction. It works, but it hasn't been hardened with tests yet — please try it and report anything that feels off.",
      trackingUrl,
      trackingLabel = 'Track progress',
      className = '',
    },
    ref,
  ) {
    if (mode === 'inline') {
      return (
        <span
          ref={ref as React.Ref<HTMLDivElement> & React.Ref<HTMLSpanElement>}
          role="status"
          title={description}
          className={
            'inline-flex items-center gap-1 align-middle rounded-full ' +
            'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ' +
            'border border-primary-yellow-500/55 ' +
            'bg-primary-yellow-500/15 text-primary-yellow-800 ' +
            'dark:bg-primary-yellow-500/10 dark:text-primary-yellow-300 dark:border-primary-yellow-500/30 ' +
            className
          }
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-primary-yellow-600 dark:bg-primary-yellow-400 animate-pulse motion-reduce:animate-none"
          />
          {title}
        </span>
      )
    }

    return (
      <div
        ref={ref}
        role="note"
        aria-label="Experimental feature"
        className={
          'relative flex gap-3 rounded-xl border p-3.5 sm:p-4 overflow-hidden ' +
          'border-primary-yellow-500/40 bg-primary-yellow-500/8 ' +
          'dark:border-primary-yellow-500/25 dark:bg-primary-yellow-500/5 ' +
          className
        }
      >
        {/* Diagonal construction stripes — subtle, behind content */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.18] dark:opacity-[0.10]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, currentColor 0 1px, transparent 1px 14px)',
            color: '#ffde59',
          }}
        />
        {/* Left accent bar */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-primary-yellow-400 to-primary-yellow-600"
        />

        <div className="relative flex-shrink-0 mt-0.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-yellow-500/25 text-primary-yellow-800 dark:bg-primary-yellow-500/15 dark:text-primary-yellow-300">
            <FlaskConical className="h-[18px] w-[18px]" />
          </div>
          <span
            aria-hidden="true"
            className="absolute -top-0.5 -right-0.5 inline-block h-2.5 w-2.5 rounded-full bg-primary-yellow-500 ring-2 ring-white dark:ring-greyscale-900 animate-pulse motion-reduce:animate-none"
          />
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold leading-tight text-greyscale-900 dark:text-greyscale-50">
              {title}
            </p>
            <span className="inline-flex items-center rounded-full bg-primary-yellow-500/35 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-yellow-900 dark:bg-primary-yellow-500/20 dark:text-primary-yellow-300">
              Under construction
            </span>
          </div>
          <p className="text-[13px] leading-relaxed text-greyscale-700 dark:text-greyscale-300">
            {description}
          </p>
          {trackingUrl && (
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary-yellow-800 hover:underline dark:text-primary-yellow-300"
            >
              {trackingLabel}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    )
  },
)

ExperimentalBadge.displayName = 'ExperimentalBadge'
