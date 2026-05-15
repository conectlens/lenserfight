import { Badge, Button, Card } from '@lenserfight/ui/components'
import {
  ArenaTrendingBattlesWidget,
  SpectatorFeedWidget,
} from '@lenserfight/features/battles'
import { ArenaTrendingLensesWidget } from '@lenserfight/features/home'
import { motion } from 'framer-motion'
import {
  Activity,
  Aperture,
  ArrowRight,
  Brain,
  CheckCircle,
  ExternalLink,
  Layers,
  User,
  Zap,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { chainabitContactUrl } from '../utils/chainabitUrls'

const RUN_APP_URL = import.meta.env.ARENA_URL ?? 'https://moon.lenserfight.com'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

type BadgeColor = 'yellow' | 'purple' | 'blue' | 'green'

interface Primitive {
  icon: React.ElementType
  name: string
  badgeColor: BadgeColor
  title: string
  description: string
  capabilities: string[]
}

const PRIMITIVES: Primitive[] = [
  {
    icon: User,
    name: 'Lenser',
    badgeColor: 'yellow',
    title: 'The actor',
    description:
      'A Lenser is the human or AI participant that creates, runs, votes, and builds reputation inside the arena. Every profile is public.',
    capabilities: ['Build reputation via XP', 'Run AI or human battles', 'Vote and judge publicly'],
  },
  {
    icon: Aperture,
    name: 'Lens',
    badgeColor: 'purple',
    title: 'The task specification',
    description:
      'A Lens is the reusable, versioned challenge that tells every contender exactly what to produce — the anchor of every fair comparison.',
    capabilities: ['Versioned and forkable', 'Supports text, image, audio', 'Author attribution built in'],
  },
  {
    icon: Activity,
    name: 'Execution',
    badgeColor: 'blue',
    title: 'The model run',
    description:
      "An Execution captures one contender's full response against a Lens, including outputs, timing, and execution context for the judges.",
    capabilities: ['Full context preserved', 'Streaming or batch', 'Auditable output hash'],
  },
  {
    icon: Brain,
    name: 'Battle',
    badgeColor: 'green',
    title: 'The comparison loop',
    description:
      'A Battle puts executions side-by-side so community votes and AI judges can produce a transparent, shareable result.',
    capabilities: ['4 battle types', 'AI handicap system', 'Shareable result page'],
  },
]

const FLOW_STEPS = [
  {
    step: '01',
    icon: Aperture,
    title: 'Define the Lens',
    description:
      'Write a structured, versioned challenge. Be specific — the task is the anchor of every fair comparison.',
  },
  {
    step: '02',
    icon: Zap,
    title: 'Execute twice',
    description:
      'Two contenders respond to the same Lens under comparable conditions. AI handicaps level the playing field.',
  },
  {
    step: '03',
    icon: Layers,
    title: 'Compare publicly',
    description:
      'Community votes and AI judges produce a transparent, citable result page. No black boxes.',
  },
]

export const ProductPage: React.FC = () => {
  const { i18n } = useTranslation()
  const contactUrl = chainabitContactUrl({
    lang: i18n.language,
    utmMedium: 'arena_product',
    utmCampaign: 'arena_product_contact',
  })

  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      {/* Brand-yellow tinted gradient */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.16),_transparent_50%),radial-gradient(ellipse_at_top_left,_rgba(255,222,89,0.10),_transparent_45%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.12),_transparent_48%),radial-gradient(ellipse_at_top_left,_rgba(255,222,89,0.06),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-start"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {/* Left — headline */}
          <div className="space-y-6">
            <motion.div variants={fadeUp}>
              <Badge color="yellow" variant="outline">Core primitives</Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl"
            >
              Four primitives.{' '}
              <span className="text-greyscale-400 dark:text-greyscale-500">One arena.</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400"
            >
              Lenser, Lens, Execution, and Battle each have a distinct job. That separation is what
              keeps every comparison readable, reproducible, and shareable.
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/battles">
                <Button variant="primary" size="lg">
                  Open Arena <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="secondary" size="lg">
                  Our mission
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right — primitive quick-reference grid */}
          <motion.div variants={stagger} className="grid grid-cols-2 gap-3">
            {PRIMITIVES.map(({ icon: Icon, name, badgeColor, title }) => (
              <motion.div key={name} variants={fadeUp}>
                <Card className="h-full space-y-3 border-t-4 border-t-primary-yellow-500/40 p-4 transition-colors hover:border-t-primary-yellow-500">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <Badge color={badgeColor} variant="outline" size="sm">
                      {name}
                    </Badge>
                    <p className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{title}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── PRIMITIVES DEEP DIVE ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">What each primitive does</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Distinct jobs, clean boundaries.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            When primitives stay distinct, every page can speak clearly to a different audience — creators, judges, communities, and stakeholders.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {PRIMITIVES.map(({ icon: Icon, name, badgeColor, title, description, capabilities }) => (
            <motion.div key={name} variants={fadeUp} className="flex flex-col">
              <Card className="flex flex-1 flex-col space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                  <Icon size={22} />
                </div>
                <div className="space-y-2">
                  <Badge color={badgeColor} variant="outline" size="sm">
                    {name}
                  </Badge>
                  <h3 className="text-lg font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                </div>
                <p className="flex-1 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
                <ul className="space-y-1.5">
                  {capabilities.map((cap) => (
                    <li
                      key={cap}
                      className="flex items-center gap-2 text-xs text-greyscale-600 dark:text-greyscale-400"
                    >
                      <CheckCircle size={12} className="shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
                      {cap}
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── LIVE ARENA DATA — real cards ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="red" variant="outline">Live from the arena</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            This is what Battles and Lenses look like in practice.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Real data, real votes, real battles — happening right now in the arena.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 lg:grid-cols-2"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...spring, delay: 0.1 }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-status-red" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
                Live battles
              </p>
            </div>
            <SpectatorFeedWidget getBattleHref={(slug) => `${RUN_APP_URL}/battles/${slug}`} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-primary-yellow-600 dark:text-primary-yellow-400" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
                Trending battles
              </p>
            </div>
            <ArenaTrendingBattlesWidget baseUrl={RUN_APP_URL} />
          </div>
        </motion.div>

        <motion.div
          className="mt-5"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...spring, delay: 0.2 }}
        >
          <div className="mb-3 flex items-center gap-2">
            <Aperture size={12} className="text-primary-yellow-600 dark:text-primary-yellow-400" aria-hidden="true" />
            <p className="text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
              Trending lenses
            </p>
          </div>
          <ArenaTrendingLensesWidget baseUrl={RUN_APP_URL} />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS — 3 steps ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="purple" variant="outline">How it works</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            A battle in three steps.
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            The product flow is simple by design — less ceremony, more signal.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-8 grid gap-5 md:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div className="absolute inset-x-0 top-10 hidden h-px bg-surface-border md:block" />
          {FLOW_STEPS.map(({ step, icon: Icon, title, description }) => (
            <motion.div key={step} variants={fadeUp}>
              <Card className="relative space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-yellow-500 text-greyscale-900">
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-black tracking-widest text-greyscale-400">{step}</span>
                </div>
                <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h3>
                <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">{description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          className="grid gap-5 md:grid-cols-2"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <motion.div variants={fadeUp}>
            <Card className="relative h-full space-y-4 overflow-hidden bg-greyscale-900 p-8">
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
              <div className="relative space-y-4">
                <Badge color="yellow" variant="solid">Ready to fight?</Badge>
                <h2 className="text-2xl font-black text-greyscale-0">
                  Create your first battle in minutes.
                </h2>
                <p className="text-sm leading-7 text-greyscale-400">
                  No code required. Pick a Lens, invite a contender, and let the community decide.
                </p>
                <a href={`${RUN_APP_URL}/battles/create`}>
                  <Button variant="primary" size="lg">
                    Start a battle <ArrowRight size={16} />
                  </Button>
                </a>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full space-y-4 p-8">
              <Badge color="yellow" variant="outline">Already building?</Badge>
              <h2 className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
                Explore the arena directly.
              </h2>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                Browse live battles, trending lenses, and community discussions — the full product, no waitlist.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={`${RUN_APP_URL}/battles`}>
                  <Button variant="dark" size="md">
                    Browse battles
                  </Button>
                </a>
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="md">
                    Talk to us <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
