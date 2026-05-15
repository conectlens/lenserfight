import { Card, HelpButton, Tooltip } from '@lenserfight/ui/components'
import React from 'react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description?: string
  toolbar?: React.ReactNode
  /**
   * Locale-agnostic docs path (e.g. '/how-to/agents/workspace-guide#overview').
   * When provided, a HelpButton is rendered in the header that links to the
   * matching docs page for this section. Information Expert: SectionPage owns
   * the surface, so it also owns the docs entry point for that surface.
   */
  docsPath?: string
  /**
   * Short hover tooltip text shown on the docs HelpButton. Falls back to a
   * generic "Read the documentation for this section" message.
   */
  docsTip?: string
  /**
   * Label rendered next to the HelpButton icon. Defaults to "Docs".
   */
  docsLabel?: string
  children: React.ReactNode
}

export const SectionPage: React.FC<SectionPageProps> = ({
  eyebrow,
  title,
  description,
  toolbar,
  docsPath,
  docsTip,
  docsLabel = 'Docs',
  children,
}) => (
  <section className="space-y-6">
    <Card className="bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-200/70 dark:from-[#1d160d] dark:via-surface-raised dark:to-[#180d08] dark:border-amber-500/20">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
            {eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
              {description}
            </p>
          )}
        </div>
        {(toolbar || docsPath) && (
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
            {docsPath && (
              <Tooltip
                content={docsTip ?? 'Read the documentation for this section'}
                position="bottom"
                contentClassName="max-w-xs whitespace-normal text-left"
              >
                <HelpButton path={docsPath} label={docsLabel} />
              </Tooltip>
            )}
            {toolbar}
          </div>
        )}
      </div>
    </Card>
    {children}
  </section>
)
