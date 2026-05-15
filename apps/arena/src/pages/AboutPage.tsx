import { AiLenserFamily, Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle,
  Code2,
  ExternalLink,
  Eye,
  GitBranch,
  Globe,
  Lightbulb,
  Radio,
  Scale,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'
import { CHAINABIT_APP_URL } from '@lenserfight/utils/env'

import { chainabitContactUrl } from '../utils/chainabitUrls'

const BrandVideos = React.lazy(() => import('../components/BrandVideos'))

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const VALUES = [
  {
    icon: Eye,
    title: 'Radical transparency',
    description:
      'Every battle result — who voted, what the rubric said, and which model won — is public and auditable forever.',
  },
  {
    icon: Target,
    title: 'Fair competition',
    description:
      'AI handicap settings normalize speed advantages so quality is the only thing that determines the winner.',
  },
  {
    icon: Globe,
    title: 'Open evaluation',
    description:
      'Anyone can create a Lens, run a battle, or vote — no closed ecosystem, no vendor lock-in.',
  },
  {
    icon: Users,
    title: 'Community ownership',
    description:
      "The community decides what's best. AI judges add structure; human votes add context. Both matter.",
  },
]

const HERO_SIGNALS = [
  {
    value: '4',
    label: 'Battle formats',
    detail: 'Human, AI, mixed, and judged matchups share one public result model.',
  },
  {
    value: '100%',
    label: 'Public trail',
    detail: 'Votes, rubrics, contenders, and timing context stay inspectable after the battle.',
  },
  {
    value: 'Open',
    label: 'Evaluation layer',
    detail: 'A reusable arena for comparing outputs without hiding the reasoning.',
  },
]

const OPERATING_SYSTEM = [
  {
    icon: Scale,
    title: 'Comparable conditions',
    description:
      'Every contender is judged against the same Lens, with AI handicap settings visible in the result.',
  },
  {
    icon: BarChart3,
    title: 'Structured signal',
    description:
      'Community votes and AI judge scores are separate signals, so quality is easier to inspect and debate.',
  },
  {
    icon: GitBranch,
    title: 'Reusable challenges',
    description:
      'Lenses are versioned, forkable task definitions that keep benchmark prompts from becoming throwaway text.',
  },
  {
    icon: Code2,
    title: 'Open-source runway',
    description:
      'The platform is built as public infrastructure for people who want reproducible comparisons, not private rankings.',
  },
]

const TIMELINE = [
  {
    year: '2025',
    title: 'Forum & Lenses',
    description:
      'Started with a community forum and the Lens primitive — a reusable prompt format anyone could craft, share, and build on.',
  },
  {
    year: '2026',
    title: 'Arena battles',
    description:
      'Expanded into head-to-head AI battles built on top of Lenses. The community could finally run the test, inspect the result, and argue about the outcome.',
  },
  {
    year: '2026',
    title: 'Full platform',
    description:
      'Tournaments, AI judge scoring, XP progression, and the full Lens primitive ecosystem — the arena is live.',
  },
]

export const AboutPage: React.FC = () => {
  const { i18n } = useTranslation()
  const contactUrl = chainabitContactUrl({
    lang: i18n.language,
    utmMedium: 'arena_about',
    utmCampaign: 'arena_about_contact',
  })

  return (
    <div className="relative overflow-x-clip bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[linear-gradient(180deg,rgba(255,222,89,0.16),transparent_70%)] dark:bg-[linear-gradient(180deg,rgba(255,222,89,0.10),transparent_70%)]" />

      {/* ── HERO — editorial manifesto style ──────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.div
          className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-7">
            <motion.div variants={fadeUp}>
              <Badge color="yellow" variant="outline">Our mission</Badge>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
                AI evaluation deserves a public arena.
              </h1>
              <p className="max-w-2xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400">
                Closed benchmarks hide the reasoning. Private leaderboards hide the community.
                LenserFight makes every comparison public, every vote visible, and every result shareable.
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/battles">
                <Button variant="primary" size="lg">
                  Enter the Arena <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="secondary" size="lg">
                  How it works
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-3">
              {HERO_SIGNALS.map(({ value, label }) => (
                <div key={label} className="border-l border-surface-border pl-4">
                  <p className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                    {value}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
                    {label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2.25rem] bg-greyscale-950 p-5 shadow-[0_32px_100px_rgba(0,0,0,0.28)] ring-1 ring-white/10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-yellow-500/70 to-transparent" />
            <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary-yellow-500">
                    <Radio size={13} />
                    Public Arena
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                    The benchmark result should explain itself.
                  </h2>
                </div>
                <span className="rounded-full bg-status-green/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-status-green">
                  Live
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {HERO_SIGNALS.map(({ label, detail }) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-yellow-500" />
                      <div>
                        <p className="text-sm font-bold text-white">{label}</p>
                        <p className="mt-1 text-xs leading-5 text-greyscale-400">{detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                {['Lens', 'Vote', 'Result'].map((step, index) => (
                  <div key={step} className="text-center">
                    <p className="font-mono text-xs font-black text-primary-yellow-500">0{index + 1}</p>
                    <p className="mt-1 text-xs font-bold text-greyscale-300">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── ORIGIN STORY / TIMELINE ────────────────────────────────────── */}
      <section className="bg-greyscale-950 py-20 text-white lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
            <Badge color="purple" variant="outline">Our story</Badge>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Built from frustration, refined by community.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-greyscale-400">
              We didn't want another benchmark nobody could reproduce. We wanted a platform where anyone
              could run the test, inspect the result, and argue about the outcome.
            </p>
          </motion.div>

          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            {TIMELINE.map(({ year, title, description }, index) => (
              <motion.div key={`${year}-${title}`} variants={fadeUp}>
                <div className="h-full rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-mono text-xs font-black uppercase tracking-widest text-primary-yellow-500">
                      {year}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.22em] text-greyscale-500">
                      Phase 0{index + 1}
                    </span>
                  </div>
                  <p className="mt-5 text-lg font-black tracking-tight text-white">{title}</p>
                  <p className="mt-3 text-sm leading-7 text-greyscale-400">{description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── VALUES ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <motion.div
          className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div>
            <Badge color="green" variant="outline">Operating principles</Badge>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-4xl">
              Trust is a product surface.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400 lg:justify-self-end">
            The arena has to feel exciting, but the system underneath must make comparisons legible,
            fair, and repeatable. These are the guardrails behind every feature.
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {OPERATING_SYSTEM.map(({ icon: Icon, title, description }) => (
            <motion.div key={title} variants={fadeUp}>
              <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {VALUES.map(({ icon: Icon, title, description }) => (
            <motion.div key={title} variants={fadeUp}>
              <div className="h-full rounded-2xl border border-surface-border bg-surface-base p-5">
                <Icon size={18} className="text-greyscale-400" />
                <h3 className="mt-4 text-sm font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                <p className="mt-2 text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── WHY IT MATTERS — pull-quote callout ───────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <Card className="relative overflow-hidden bg-greyscale-900 p-10">
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,222,89,1),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(255,222,89,0.6),_transparent_55%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Lightbulb size={28} className="text-primary-yellow-500" />
                <blockquote className="text-2xl font-black leading-tight tracking-tight text-greyscale-0 sm:text-3xl">
                  "Quality should win — not branding, not speed, not speculation about which AI is currently hot."
                </blockquote>
                <p className="text-sm text-greyscale-400">
                  The core promise that every LenserFight feature is built to deliver.
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-shrink-0">
                <Link to="/product">
                  <Button variant="primary" size="lg" fullWidth>
                    See the primitives <Sparkles size={15} />
                  </Button>
                </Link>
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="text-greyscale-300 hover:bg-greyscale-800 hover:text-greyscale-0"
                  >
                    Talk to us <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* ── BRAND CINEMATICS ───────────────────────────────────────────── */}
      <section className="w-full pb-20 lg:pb-28">
        <motion.div
          className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">Brand Cinematics</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Motion identity
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Cinematic benchmarks require cinematic identity. These motion assets define the look of the LenserFight experience.
          </p>
        </motion.div>
        <React.Suspense fallback={<div className="mx-auto mt-8 h-[300px] max-w-6xl animate-pulse rounded-[2rem] bg-surface-raised" />}>
          <BrandVideos />
        </React.Suspense>
      </section>

      {/* ── AI LENSER FAMILY ───────────────────────────────────────────── */}
      <AiLenserFamily className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28" />

      {/* ── SPONSORS ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">Sponsors</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Backed by
          </h2>
        </motion.div>
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={spring}
        >
          <a
            href={`${CHAINABIT_APP_URL}?utm_source=lenserfight_about`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex"
          >
            <Card className="flex items-center gap-5 p-5 transition-shadow group-hover:shadow-md">
              <img
                src="https://cdn.lenserfight.com/brand/chainabit/apple-icon.png"
                width={56}
                height={56}
                alt="Chainabit"
                className="rounded-2xl"
              />
              <div>
                <p className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">Chainabit</p>
                <p className="mt-0.5 text-sm text-greyscale-500 dark:text-greyscale-400">
                  Execution credits for the LenserFight arena.
                </p>
              </div>
              <ExternalLink size={14} className="ml-auto shrink-0 text-greyscale-400 transition-colors group-hover:text-greyscale-700 dark:group-hover:text-greyscale-200" />
            </Card>
          </a>
        </motion.div>
      </section>
    </div>
  )
}
