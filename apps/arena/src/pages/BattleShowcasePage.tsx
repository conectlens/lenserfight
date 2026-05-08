import { Badge, Card, DesktopFrame, PageHeader } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Shield, Zap } from 'lucide-react'
import React from 'react'

import { HeroFightPreview } from '../components/HeroFightPreview'

const ARENA_APP_URL = import.meta.env.VITE_ARENA_URL ?? 'https://run.lenserfight.com'

const HANDICAP_DETAILS = [
  {
    icon: Clock,
    label: 'Injected delay',
    value: '2 000 ms',
    description: 'AI waits 2 seconds before it begins streaming — matching realistic human reading time.',
  },
  {
    icon: Clock,
    label: 'Time budget',
    value: '5 min',
    description: 'AI response is truncated at 5 minutes — same deadline given to the human lenser.',
  },
  {
    icon: Shield,
    label: 'Context cap',
    value: 'Unlimited',
    description: 'No context restriction in this demo — togglable per battle by the creator.',
  },
  {
    icon: Zap,
    label: 'Model tier',
    value: 'Any',
    description: 'Creator can restrict AI to free-tier models only to limit capability advantage.',
  },
]

export function BattleShowcasePage() {
  return (
    <div className="relative overflow-hidden bg-surface-base">
      <div className="absolute inset-x-0 top-0 -z-10 h-[20rem] bg-[radial-gradient(circle_at_top,_rgba(40,123,255,0.10),_transparent_45%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(40,123,255,0.07),_transparent_45%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Header */}
        <motion.div
          className="mb-10 space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        >
          <Badge color="yellow" variant="outline">Battle showcase · Human vs AI</Badge>
          <PageHeader
            title={
              <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
                Watch a full battle lifecycle
              </h1>
            }
            description="This demo cycles through a live Human vs AI battle — idle waiting room, voting phase, and result reveal. Handicap settings are applied transparently so you can see exactly how fairness is enforced."
            className="mt-2"
          />
        </motion.div>

        {/* Live demo frame */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0, 0, 0.2, 1] }}
        >
          <DesktopFrame title="Human vs AI battle demo" url="lenserfight.com/battles/live-demo" label="Auto-cycling · 4 s per phase">
            <HeroFightPreview />
          </DesktopFrame>
        </motion.div>

        {/* Handicap audit section */}
        <motion.div
          className="mb-12 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0, 0, 0.2, 1] }}
        >
          <div className="space-y-2">
            <Badge color="yellow" variant="outline">Handicap audit</Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              AI fairness — what was applied
            </h2>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              Every handicap is recorded in the battle audit log. Voters can see exactly what restrictions were enforced before the AI submitted its response.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {HANDICAP_DETAILS.map(({ icon: Icon, label, value, description }) => (
              <Card key={label} className="flex gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-greyscale-500">
                  <Icon size={18} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-greyscale-500">{label}</p>
                    <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{value}</p>
                  </div>
                  <p className="text-xs leading-5 text-greyscale-500 dark:text-greyscale-400">{description}</p>
                </div>
              </Card>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="rounded-3xl border border-surface-border bg-surface-raised p-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3, ease: [0, 0, 0.2, 1] }}
        >
          <p className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">
            Ready to run your own battle?
          </p>
          <p className="mt-2 text-sm text-greyscale-500">
            Set your own handicap params, choose the contenders, and let the community judge.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`${ARENA_APP_URL}/battles/create`}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              Create a battle <ArrowRight size={15} />
            </a>
            <a
              href={`${ARENA_APP_URL}/battles`}
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Browse live battles
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
