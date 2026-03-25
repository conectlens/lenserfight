import { Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { ArrowRight, ShieldCheck, Trophy, MessagesSquare, Layers3, Bolt } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'


const HERO_POINTS = [
  'Compare outputs with a public vote trail.',
  'Show the rubric, result, and share link in one place.',
  'Keep the product language simple: Lenser, Lens, Execution, Battle.',
]

const VALUE_CARDS = [
  {
    icon: MessagesSquare,
    title: 'Community judgment',
    description: 'Every battle invites a human answer, not just an automated score.',
  },
  {
    icon: Layers3,
    title: 'Structured evaluation',
    description: 'The Lens and rubric keep the comparison fair and reproducible.',
  },
  {
    icon: Trophy,
    title: 'Shareable results',
    description: 'Result pages are designed to be cited, discussed, and revisited.',
  },
]

export const LandHomePage: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.18),_transparent_50%),radial-gradient(circle_at_right,_rgba(40,123,255,0.12),_transparent_42%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(40,123,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-24">
        <div className="space-y-6">
          <Badge color="yellow" variant="outline">
            Live arena
          </Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
              Bring your Lens to the Arena and let the comparison speak for itself.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
              LenserFight turns model evaluation into a readable product surface. Community votes, rubric signals,
              and shareable result pages make quality legible without hiding the work behind a black box.
            </p>
          </div>

          <ul className="space-y-3">
            {HERO_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                <ShieldCheck size={18} className="mt-1 shrink-0 text-status-green" />
                <span>{point}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/battles"
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              Enter the Arena <ArrowRight size={16} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Learn the product
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Vote first', value: 'Community signal' },
              { label: 'Rubric second', value: 'Additive context' },
              { label: 'Share last', value: 'Public proof' },
            ].map((item) => (
              <Card key={item.label} className="space-y-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">{item.label}</p>
                <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">{item.value}</p>
              </Card>
            ))}
          </div>
        </div>

        <DesktopFrame title="Battle preview" url="lenserfight.com/battles/live" label="Public demo">
          <div className="space-y-4">
            <Card className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <Badge color="blue" variant="outline">
                  Lens
                </Badge>
                <span className="text-xs text-greyscale-500">Prompt: open and legible</span>
              </div>
              <p className="text-base font-semibold text-greyscale-900 dark:text-greyscale-0">
                Rewrite a technical error message for a non-technical user.
              </p>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                Two contenders answer the same task. The output, vote, and result all stay visible.
              </p>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: 'Runner A', color: 'blue', text: 'Clearer tone, shorter response, stronger user empathy.' },
                { label: 'Runner B', color: 'purple', text: 'More technical detail, but the explanation is harder to scan.' },
              ].map(({ label, color, text }) => (
                <Card key={label} className="space-y-3 p-5">
                  <div className="flex items-center justify-between">
                    <Badge color={color as 'blue' | 'purple'} variant="outline">
                      {label}
                    </Badge>
                    <span className="text-xs text-greyscale-500">Output</span>
                  </div>
                  <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{text}</p>
                </Card>
              ))}
            </div>

            <Card className="flex items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-greyscale-500">Vote result</p>
                <p className="mt-1 text-sm font-semibold text-greyscale-900 dark:text-greyscale-0">
                  63% to Runner A, 37% to Runner B
                </p>
              </div>
              <Badge color="green">Published</Badge>
            </Card>
          </div>
        </DesktopFrame>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_CARDS.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-800 dark:bg-primary-yellow-500/10 dark:text-primary-yellow-400">
                <Icon size={22} />
              </div>
              <h2 className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h2>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <Card className="flex flex-col gap-6 p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <Badge color="purple" variant="outline">
              Proof-led
            </Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              The public pages are designed to explain the product before asking people to sign up.
            </h2>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              That keeps the commercial layer conversion-oriented without sacrificing the clarity of the product
              story.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/product"
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Product map
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              Contact us <Bolt size={16} />
            </Link>
          </div>
        </Card>
      </section>
    </div>
  )
}
