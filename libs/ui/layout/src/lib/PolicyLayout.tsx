import React from 'react'
import { Link, useLocation } from 'react-router-dom'

import { Badge, Card } from '@lenserfight/ui/components'

export interface PolicyLayoutProps {
  title: string
  children: React.ReactNode
}

const POLICY_LINKS = [
  { to: '/policies/terms', label: 'Terms' },
  { to: '/policies/privacy', label: 'Privacy' },
  { to: '/policies/cookies', label: 'Cookies' },
  { to: '/policies/acceptable-use', label: 'Acceptable Use' },
]

export function PolicyLayout({ title, children }: PolicyLayoutProps) {
  const location = useLocation()

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 text-greyscale-900 dark:text-greyscale-50 md:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:py-16">
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <Card className="space-y-5 p-5">
          <Badge color="gray" variant="outline">
            Legal
          </Badge>
          <div>
            <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              Policy center
            </h2>
            <p className="mt-2 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              Terms, privacy, and acceptable use rules for the public Arena.
            </p>
          </div>
          <nav className="space-y-1">
            {POLICY_LINKS.map(({ to, label }) => {
              const active = location.pathname === to
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center justify-between rounded-2xl px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-surface-raised text-greyscale-900 dark:text-greyscale-0'
                      : 'text-greyscale-500 hover:bg-surface-raised hover:text-greyscale-900 dark:text-greyscale-400 dark:hover:text-greyscale-0'
                  }`}
                >
                  <span>{label}</span>
                  {active && <span className="h-2 w-2 rounded-full bg-status-blue" />}
                </Link>
              )
            })}
          </nav>
        </Card>
      </aside>

      <main className="space-y-6">
        <Card className="space-y-3 p-6">
          <Badge color="blue" variant="outline">
            {title}
          </Badge>
          <h1 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            These policies set the baseline for use of LenserFight’s public Arena and community surfaces.
          </p>
        </Card>

        <article className="prose prose-slate max-w-none prose-headings:scroll-mt-24 prose-headings:text-greyscale-900 prose-p:text-greyscale-600 prose-li:text-greyscale-600 dark:prose-headings:text-greyscale-0 dark:prose-p:text-greyscale-400 dark:prose-li:text-greyscale-400">
          {children}
        </article>
      </main>
    </div>
  )
}
