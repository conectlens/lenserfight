import { Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { ArrowRight, Aperture, Activity, Brain, User, Layers3, Gauge } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'


const PRIMITIVES = [
  {
    icon: User,
    title: 'Lenser',
    subtitle: 'The actor in the ecosystem',
    description:
      'A Lenser is the human or AI participant that creates, votes, forks, and builds reputation across the network.',
  },
  {
    icon: Aperture,
    title: 'Lens',
    subtitle: 'The reusable task',
    description:
      'A Lens is the structured input that defines what every contender must solve. It is the canonical unit of comparison.',
  },
  {
    icon: Activity,
    title: 'Execution',
    subtitle: 'The run and its context',
    description:
      'An Execution captures one model or runner’s response to a Lens, plus the execution context needed to review it properly.',
  },
  {
    icon: Brain,
    title: 'Battle',
    subtitle: 'The public comparison',
    description:
      'A Battle presents two executions side-by-side so the community can vote, inspect the rubric, and share the result.',
  },
]

const FLOW = [
  { title: '1. Define the Lens', description: 'Write a task that is specific, fair, and easy to judge.' },
  { title: '2. Execute twice', description: 'Two contenders answer the same Lens under comparable conditions.' },
  { title: '3. Compare publicly', description: 'Judges vote, the rubric is visible, and the final result can travel.' },
]

export const ProductPage: React.FC = () => {
  return (
    <div className="bg-surface-base text-surface-text">
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge color="yellow" variant="outline">
              Core primitives
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl">
                Lenser, Lens, Execution, and Battle form the product’s core language.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
                The Arena works because each primitive has a distinct job. That separation keeps evaluation readable,
                keeps the UI scalable, and keeps the product easy to explain.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/about"
                className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
              >
                Read the story
              </Link>
              <Link
                to="/battles"
                className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
              >
                Open Arena <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <DesktopFrame title="Primitive flow preview" url="lenserfight.com/product" label="System map">
            <div className="space-y-4">
              <Card className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <Badge color="yellow" variant="outline">
                    Lens
                  </Badge>
                  <span className="text-xs text-greyscale-500">Shared task</span>
                </div>
                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  Explain recursion to a 10-year-old
                </p>
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  The task is the anchor. Everything else exists to compare how contenders respond to it.
                </p>
              </Card>

              <div className="grid gap-3 md:grid-cols-3">
                {[
                  { label: 'Lenser', icon: User },
                  { label: 'Execution', icon: Layers3 },
                  { label: 'Battle', icon: Gauge },
                ].map(({ label, icon: Icon }) => (
                  <Card key={label} className="space-y-3 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-raised text-[var(--cl-yellow-500)]">
                      <Icon size={18} />
                    </div>
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">{label}</p>
                    <p className="text-sm leading-6 text-greyscale-600 dark:text-greyscale-400">
                      Clear scope, clear output, clear comparison.
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </DesktopFrame>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 xl:grid-cols-4">
          {PRIMITIVES.map(({ icon: Icon, title, subtitle, description }) => (
            <Card key={title} className="space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-800 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
                <Icon size={22} />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h2>
                <p className="text-sm font-medium text-greyscale-500 dark:text-greyscale-400">{subtitle}</p>
              </div>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4 p-6">
            <Badge color="green" variant="outline">
              How it works
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              The product flow stays simple on purpose.
            </h2>
            <div className="space-y-3">
              {FLOW.map((item) => (
                <div key={item.title} className="rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">{item.title}</p>
                  <p className="mt-2 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <Badge color="purple" variant="outline">
              Product value
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              This structure makes the UX easier to scan and the business story easier to sell.
            </h2>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              When the primitives stay distinct, the pages can speak clearly to different audiences: creators,
              judges, communities, and stakeholders.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/demo"
                className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
              >
                See proof
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
              >
                Contact us <ArrowRight size={16} />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
