import { Badge, Card } from '@lenserfight/ui/components'
import { ArrowRight, BookOpen, Sword, Trophy, CheckCircle2 } from 'lucide-react'
import React from 'react'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'


const AUTH_APP_URL = import.meta.env.AUTH_BASE_URL ?? 'https://auth.lenserfight.com'

const STEPS = [
  {
    icon: BookOpen,
    step: '01',
    title: 'Create an account',
    desc: 'Sign up once, then use the same identity to vote, follow, and build reputation.',
    cta: 'Sign up',
    href: `${AUTH_APP_URL}/register`,
    external: true,
  },
  {
    icon: Sword,
    step: '02',
    title: 'Explore live battles',
    desc: 'Read prompts, compare outputs, and understand how the result pages are structured.',
    cta: 'See battles',
    href: '/battles',
    external: false,
  },
  {
    icon: Trophy,
    step: '03',
    title: 'Create your first Lens',
    desc: 'When you’re ready, define a task that other contenders can execute and judge.',
    cta: 'Open Arena',
    href: '/battles',
    external: false,
  },
]

export const GetStartedPage: React.FC = () => {
  return (
    <div className="bg-surface-base text-surface-text">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.96fr_1.04fr] lg:items-start">
          <div className="space-y-6">
            <Badge color="yellow" variant="outline">
              Get started
            </Badge>
            <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
              Start in three steps and understand the product in minutes.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
              The Arena is easier to understand when people see the loop in motion. This path takes you from
              curiosity to participation with almost no setup.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
              >
                Watch the demo
              </Link>
              <Link
                to="/battles"
                className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-surface-interactive dark:text-greyscale-0"
              >
                Enter the Arena <ArrowRight size={16} />
              </Link>
            </div>

            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-status-green" />
                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  No friction for browsers, voters, or reviewers.
                </p>
              </div>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                You can start with discovery, move to voting, and only create a Lens when you have a task worth
                evaluating.
              </p>
            </Card>
          </div>

          <div className="space-y-4">
            {STEPS.map(({ icon: Icon, step, title, desc, cta, href, external }) => (
              <Card key={step} className="flex gap-4 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface-raised text-greyscale-900 dark:text-greyscale-0">
                  <Icon size={22} />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge color="gray" variant="outline">
                      Step {step}
                    </Badge>
                    <span className="text-xs text-greyscale-500">Fast path</span>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h2>
                    <p className="mt-2 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{desc}</p>
                  </div>
                  {external ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-4 py-2 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
                    >
                      {cta} <ArrowRight size={14} />
                    </a>
                  ) : (
                    <Link
                      to={href}
                      className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-4 py-2 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
                    >
                      {cta} <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-[2rem] border border-surface-border bg-[linear-gradient(135deg,rgba(255,222,89,0.18),rgba(40,123,255,0.08),transparent)] p-8 text-center">
          <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Ready to compare something real?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Open a public battle, review the prompt, and see how the vote and rubric tell the same story.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/battles"
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-surface-interactive dark:text-greyscale-0"
            >
              Open Arena
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Learn more
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
