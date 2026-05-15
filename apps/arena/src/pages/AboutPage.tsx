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

const VALUE_ICONS = [Eye, Target, Globe, Users] as const
const OPERATING_ICONS = [Scale, BarChart3, GitBranch, Code2] as const
const TIMELINE_INDICES = [0, 1, 2] as const
const SIGNAL_INDICES = [0, 1, 2] as const

export const AboutPage: React.FC = () => {
  const { i18n, t } = useTranslation(['about', 'common'])
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
              <Badge color="yellow" variant="outline">{t('about:hero.badge')}</Badge>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-5">
              <h1 className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
                {t('about:hero.headline')}
              </h1>
              <p className="max-w-2xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400">
                {t('about:hero.subheadline')}
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/battles">
                <Button variant="primary" size="lg">
                  {t('common:cta.enterArena')} <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/product">
                <Button variant="secondary" size="lg">
                  {t('common:cta.howItWorks')}
                </Button>
              </Link>
            </motion.div>

            <motion.div variants={fadeUp} className="grid gap-3 sm:grid-cols-3">
              {SIGNAL_INDICES.map((i) => {
                const value = t(`about:hero.signals.${i}.value`)
                const label = t(`about:hero.signals.${i}.label`)
                return (
                  <div key={i} className="border-l border-surface-border pl-4">
                    <p className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                      {value}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
                      {label}
                    </p>
                  </div>
                )
              })}
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-[2.25rem] bg-white dark:bg-greyscale-950 p-5 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-yellow-500/70 to-transparent" />
            <div className="rounded-[1.75rem] border border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary-yellow-500">
                    <Radio size={13} />
                    {t('about:heroCard.publicArena')}
                  </div>
                  <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-white">
                    {t('about:heroCard.headline')}
                  </h2>
                </div>
                <span className="rounded-full bg-status-green/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-status-green">
                  {t('common:badges.live')}
                </span>
              </div>

              <div className="mt-6 space-y-3">
                {SIGNAL_INDICES.map((i) => {
                  const label = t(`about:hero.signals.${i}.label`)
                  const detail = t(`about:hero.signals.${i}.detail`)
                  return (
                    <div key={i} className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle size={16} className="mt-0.5 shrink-0 text-primary-yellow-500" />
                        <div>
                          <p className="text-sm font-bold text-greyscale-900 dark:text-white">{label}</p>
                          <p className="mt-1 text-xs leading-5 text-greyscale-600 dark:text-greyscale-400">{detail}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
                {[0, 1, 2].map((index) => {
                  const step = t(`about:heroCard.steps.${index}`)
                  return (
                    <div key={index} className="text-center">
                      <p className="font-mono text-xs font-black text-primary-yellow-500">0{index + 1}</p>
                      <p className="mt-1 text-xs font-bold text-greyscale-500 dark:text-greyscale-300">{step}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── ORIGIN STORY / TIMELINE ────────────────────────────────────── */}
      <section className="bg-surface-base dark:bg-greyscale-950 py-20 text-surface-text dark:text-white lg:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
            <Badge color="purple" variant="outline">{t('about:timeline.badge')}</Badge>
            <h2 className="mt-3 max-w-3xl text-3xl font-black tracking-tight text-greyscale-900 dark:text-white sm:text-4xl">
              {t('about:timeline.title')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              {t('about:timeline.subtitle')}
            </p>
          </motion.div>

          <motion.div
            className="mt-10 grid gap-4 md:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            {TIMELINE_INDICES.map((index) => {
              const year = t(`about:timeline.entries.${index}.year`)
              const title = t(`about:timeline.entries.${index}.title`)
              const description = t(`about:timeline.entries.${index}.description`)
              return (
                <motion.div key={index} variants={fadeUp}>
                  <div className="h-full rounded-[1.75rem] border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-6">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-xs font-black uppercase tracking-widest text-primary-yellow-500">
                        {year}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-[0.22em] text-greyscale-500">
                        {t('about:timeline.phaseLabel', { num: `0${index + 1}`, defaultValue: `Phase 0${index + 1}` })}
                      </span>
                    </div>
                    <p className="mt-5 text-lg font-black tracking-tight text-greyscale-900 dark:text-white">{title}</p>
                    <p className="mt-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
                  </div>
                </motion.div>
              )
            })}
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
            <Badge color="green" variant="outline">{t('about:values.badge')}</Badge>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-4xl">
              {t('about:values.title')}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400 lg:justify-self-end">
            {t('about:values.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {OPERATING_ICONS.map((Icon, i) => {
            const title = t(`about:values.operating.${i}.title`)
            const description = t(`about:values.operating.${i}.description`)
            return (
              <motion.div key={i} variants={fadeUp}>
                <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                  <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        <motion.div
          className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {VALUE_ICONS.map((Icon, i) => {
            const title = t(`about:values.core.${i}.title`)
            const description = t(`about:values.core.${i}.description`)
            return (
              <motion.div key={i} variants={fadeUp}>
                <div className="h-full rounded-2xl border border-surface-border bg-surface-base p-5">
                  <Icon size={18} className="text-greyscale-400" />
                  <h3 className="mt-4 text-sm font-bold text-greyscale-900 dark:text-greyscale-50">{title}</h3>
                  <p className="mt-2 text-xs leading-6 text-greyscale-500 dark:text-greyscale-400">{description}</p>
                </div>
              </motion.div>
            )
          })}
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
          <Card className="relative overflow-hidden bg-white dark:bg-greyscale-900 p-10 ring-1 ring-black/5 dark:ring-white/10">
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,222,89,1),_transparent_60%),radial-gradient(ellipse_at_bottom_right,_rgba(255,222,89,0.6),_transparent_55%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Lightbulb size={28} className="text-primary-yellow-500" />
                <blockquote className="text-2xl font-black leading-tight tracking-tight text-greyscale-950 dark:text-greyscale-0 sm:text-3xl">
                  {t('about:quote.text')}
                </blockquote>
                <p className="text-sm text-greyscale-600 dark:text-greyscale-400">
                  {t('about:quote.caption')}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-shrink-0">
                <Link to="/product">
                  <Button variant="primary" size="lg" fullWidth>
                    {t('common:cta.seePrimitives')} <Sparkles size={15} />
                  </Button>
                </Link>
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="text-greyscale-600 dark:text-greyscale-300 hover:bg-black/5 dark:hover:bg-greyscale-800 hover:text-greyscale-900 dark:hover:text-greyscale-0"
                  >
                    {t('common:cta.talkToUs')} <ExternalLink size={14} />
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
          <Badge color="yellow" variant="outline">{t('about:brand.badge')}</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('about:brand.title')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('about:brand.subtitle')}
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
          <Badge color="yellow" variant="outline">{t('about:sponsors.badge')}</Badge>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('about:sponsors.title')}
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
                alt={t('common:labels.chainabit')}
                className="rounded-2xl"
              />
              <div>
                <p className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">{t('common:labels.chainabit')}</p>
                <p className="mt-0.5 text-sm text-greyscale-500 dark:text-greyscale-400">
                  {t('about:sponsors.chainabit')}
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
