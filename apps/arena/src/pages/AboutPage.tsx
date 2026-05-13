import { AiLenserFamily, Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ExternalLink,
  Eye,
  Globe,
  Lightbulb,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
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
      {/* Brand-yellow tinted gradient — softer than Home */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[32rem] bg-[radial-gradient(ellipse_at_top_left,_rgba(255,222,89,0.16),_transparent_55%),radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.08),_transparent_50%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top_left,_rgba(255,222,89,0.12),_transparent_50%),radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.06),_transparent_45%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO — editorial manifesto style ──────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-28">
        <motion.div
          className="max-w-4xl"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Badge color="yellow" variant="outline">Our mission</Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="mt-5 text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl"
          >
            AI evaluation{' '}
            <span className="relative inline-block">
              <span className="relative z-10">deserves</span>
              <span className="absolute inset-x-0 bottom-1 -z-10 h-4 rounded bg-primary-yellow-500/30" />
            </span>{' '}
            a public arena.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mt-6 max-w-2xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400"
          >
            Closed benchmarks hide the reasoning. Private leaderboards hide the community.
            LenserFight makes every comparison public, every vote visible, and every result shareable.
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
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
        </motion.div>

        {/* Stat strip */}
        <motion.div
          className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-surface-border bg-surface-border sm:grid-cols-3"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          {[
            { value: '10K+', label: 'Battles judged' },
            { value: '4', label: 'Battle types' },
            { value: '100%', label: 'Public results' },
          ].map(({ value, label }) => (
            <motion.div
              key={label}
              variants={fadeUp}
              className="bg-surface-base px-8 py-7 text-center"
            >
              <p className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">{value}</p>
              <p className="mt-1 text-sm text-greyscale-500 dark:text-greyscale-400">{label}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── ORIGIN STORY / TIMELINE ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="purple" variant="outline">Our story</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Built from frustration, refined by community.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            We didn't want another benchmark nobody could reproduce. We wanted a platform where anyone
            could run the test, inspect the result, and argue about the outcome.
          </p>
        </motion.div>

        <motion.div
          className="relative mt-10"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div className="absolute bottom-6 left-[3.25rem] top-6 hidden w-px bg-surface-border sm:block" />

          <div className="space-y-4">
            {TIMELINE.map(({ year, title, description }) => (
              <motion.div key={year} variants={fadeUp} className="flex gap-5">
                <div className="flex flex-shrink-0 flex-col items-center gap-2 sm:w-24">
                  <div className="z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500 text-sm font-black text-greyscale-900">
                    {year}
                  </div>
                </div>
                <Card className="flex-1 p-5">
                  <p className="text-base font-bold text-greyscale-900 dark:text-greyscale-50">{title}</p>
                  <p className="mt-2 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ── VALUES ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="green" variant="outline">What we believe</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Four principles drive every design decision.
          </h2>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {VALUES.map(({ icon: Icon, title, description }) => (
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
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">Brand Cinematics</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Motion identity
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Cinematic benchmarks require cinematic identity. These motion assets define the look of the LenserFight experience.
          </p>
        </motion.div>
        <div className="mt-8">
          <React.Suspense fallback={<div className="h-[300px] w-full animate-pulse rounded-[2rem] bg-surface-raised" />}>
            <BrandVideos />
          </React.Suspense>
        </div>
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
                src="/chainabit/apple-icon.png"
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
