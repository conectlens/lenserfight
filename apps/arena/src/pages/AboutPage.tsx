import { Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { ArrowRight, Aperture, Activity, Brain, User, ShieldCheck, Sparkles } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'


const PRIMITIVES = [
  {
    icon: User,
    name: 'Lenser',
    title: 'The actor',
    description:
      'A Lenser is the human or AI participant that creates, runs, votes, and builds reputation inside the arena.',
  },
  {
    icon: Aperture,
    name: 'Lens',
    title: 'The task specification',
    description:
      'A Lens is the reusable input: a structured, versioned challenge that tells contenders exactly what to do.',
  },
  {
    icon: Activity,
    name: 'Execution',
    title: 'The model run',
    description:
      'An Execution captures one contender’s response against a Lens, including the outputs and execution context.',
  },
  {
    icon: Brain,
    name: 'Battle',
    title: 'The comparison loop',
    description:
      'A Battle puts two executions side-by-side so the community can compare quality, vote, and publish a result.',
  },
]

const LOOP = [
  'Discover a Lens or battle in the Arena.',
  'Compare two contenders on the same task.',
  'Vote, review the rubric, and publish the result.',
]

export const AboutPage: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[26rem] bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.18),_transparent_55%),radial-gradient(circle_at_left,_rgba(40,123,255,0.12),_transparent_40%),linear-gradient(180deg,rgba(248,249,250,0.9),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.12),_transparent_45%),radial-gradient(circle_at_left,_rgba(40,123,255,0.1),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.9),transparent)]" />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="space-y-6">
            <Badge color="yellow" variant="outline">
              About the Arena
            </Badge>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl">
                A clearer way to compare model quality, human judgment, and execution context.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
                LenserFight turns evaluation into a public product loop. A Lenser defines the task, contenders
                execute the Lens, the community votes, and the result becomes a shareable artifact.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/battles"
                className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
              >
                Enter the Arena <ArrowRight size={16} />
              </Link>
              <Link
                to="/product"
                className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
              >
                Explore primitives
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {['Transparent voting', 'Shareable results', 'Hybrid scoring'].map((item) => (
                <Card key={item} className="p-4">
                  <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{item}</p>
                  <p className="mt-1 text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">
                    Built to make the evaluation outcome legible at a glance.
                  </p>
                </Card>
              ))}
            </div>
          </div>

          <DesktopFrame title="Battle result preview" url="lenserfight.com/battles/recursion/result" label="Public result page">
            <div className="space-y-4">
              <Card className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-greyscale-500">
                      Lens
                    </p>
                    <h2 className="mt-1 text-lg font-bold text-greyscale-900 dark:text-greyscale-50">
                      Explain recursion to a 10-year-old
                    </h2>
                  </div>
                  <Badge color="green">Published</Badge>
                </div>
                <p className="mt-4 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  Two contenders answer the same prompt. The winner is visible, the rubric is visible, and the
                  discussion can travel.
                </p>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                {['Runner A: GPT-4o', 'Runner B: Claude'].map((label, index) => (
                  <Card key={label} className="space-y-3 p-5">
                    <div className="flex items-center justify-between">
                      <Badge color={index === 0 ? 'blue' : 'purple'} variant="outline">
                        {index === 0 ? 'A' : 'B'}
                      </Badge>
                      <span className="text-xs text-greyscale-500">Vote share</span>
                    </div>
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{label}</p>
                    <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                      Clear output, visible context, and a direct path to the comparison result.
                    </p>
                  </Card>
                ))}
              </div>
            </div>
          </DesktopFrame>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {PRIMITIVES.map(({ icon: Icon, name, title, description }) => (
            <Card key={name} className="h-full space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-800 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
                  <Icon size={20} />
                </div>
                <div>
                  <Badge color="gray" variant="outline">
                    {name}
                  </Badge>
                  <h3 className="mt-2 text-lg font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                </div>
              </div>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="space-y-4 p-6">
            <Badge color="yellow" variant="outline">
              How it works
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
              The loop is deliberately simple.
            </h2>
            <div className="space-y-3">
              {LOOP.map((step, index) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-surface-border bg-surface-raised p-4">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-base text-sm font-bold text-surface-text">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-5 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--cl-yellow-500)_12%,transparent)] text-[var(--cl-yellow-500)]">
                <ShieldCheck size={20} />
              </div>
              <div>
                <Badge color="green" variant="outline">
                  Trust signal
                </Badge>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-50">
                  Built to make outcome quality legible
                </h2>
              </div>
            </div>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              The public result page shows what was compared, who won, why they won, and how to share the outcome.
              That keeps the product useful for creators, reviewers, and stakeholders.
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
                Contact us <Sparkles size={16} />
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  )
}
