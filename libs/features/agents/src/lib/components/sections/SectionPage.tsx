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
    <div className="rounded-[28px] border border-amber-200/60 bg-white p-6 shadow-sm dark:border-amber-500/10 dark:bg-[#0c0c0c] relative overflow-hidden group">
      {/* Subtle background glow */}
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] transition-opacity group-hover:opacity-100 dark:bg-amber-500/10" />
      
      <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-600 dark:text-amber-500/90">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-900 dark:text-white">
            {title}
          </h1>
          {description && (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
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
