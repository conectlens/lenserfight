import React from 'react'

interface SectionPageProps {
  eyebrow: string
  title: string
  description?: string
  toolbar?: React.ReactNode
  children: React.ReactNode
}

export const SectionPage: React.FC<SectionPageProps> = ({
  eyebrow,
  title,
  description,
  toolbar,
  children,
}) => (
  <section className="space-y-6">
    <div className="rounded-[28px] border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm dark:border-amber-500/20 dark:from-[#1d160d] dark:via-[#101010] dark:to-[#180d08]">
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
        {toolbar && <div className="flex flex-shrink-0 items-center gap-2">{toolbar}</div>}
      </div>
    </div>
    {children}
  </section>
)
