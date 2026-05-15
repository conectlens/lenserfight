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

const RUN_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

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

const PRIMITIVE_DEFS = [
  { icon: User, key: 'lenser', badgeColor: 'yellow' as BadgeColor, capCount: 3 },
  { icon: Aperture, key: 'lens', badgeColor: 'purple' as BadgeColor, capCount: 3 },
  { icon: Activity, key: 'execution', badgeColor: 'blue' as BadgeColor, capCount: 3 },
  { icon: Brain, key: 'battle', badgeColor: 'green' as BadgeColor, capCount: 3 },
] as const

const FLOW_ICONS = [Aperture, Zap, Layers] as const

export const ProductPage: React.FC = () => {
  const { i18n, t } = useTranslation(['product', 'common'])
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
              <Badge color="yellow" variant="outline">{t('product:hero.badge')}</Badge>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl"
            >
              {t('product:hero.headline')}{' '}
              <span className="text-greyscale-400 dark:text-greyscale-500">{t('product:hero.headlineFaded')}</span>
            </motion.h1>
            <motion.p
              variants={fadeUp}
              className="max-w-xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400"
            >
              {t('product:hero.subtitle')}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <Link to="/battles">
                <Button variant="primary" size="lg">
                  {t('common:cta.openArena')} <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/about">
                <Button variant="secondary" size="lg">
                  {t('common:cta.ourMission')}
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Right — primitive quick-reference grid */}
          <motion.div variants={stagger} className="grid grid-cols-2 gap-3">
            {PRIMITIVE_DEFS.map(({ icon: Icon, key, badgeColor }) => {
              const name = t(`product:primitives.items.${key}.name`)
              const title = t(`product:primitives.items.${key}.title`)
              return (
                <motion.div key={key} variants={fadeUp}>
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
              )
            })}
          </motion.div>
        </motion.div>
      </section>

      {/* ── PRIMITIVES DEEP DIVE ───────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">{t('product:primitives.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('product:primitives.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('product:primitives.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {PRIMITIVE_DEFS.map(({ icon: Icon, key, badgeColor, capCount }) => {
            const name = t(`product:primitives.items.${key}.name`)
            const title = t(`product:primitives.items.${key}.title`)
            const description = t(`product:primitives.items.${key}.description`)
            const capabilities = Array.from({ length: capCount }, (_, i) => t(`product:primitives.items.${key}.capabilities.${i}`))
            return (
              <motion.div key={key} variants={fadeUp} className="flex flex-col">
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
            )
          })}
        </motion.div>
      </section>

      {/* ── LIVE ARENA DATA — real cards ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="red" variant="outline">{t('product:liveData.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('product:liveData.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('product:liveData.subtitle')}
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
                {t('product:liveData.liveBattles')}
              </p>
            </div>
            <SpectatorFeedWidget getBattleHref={(slug) => `${RUN_APP_URL}/battles/${slug}`} />
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity size={12} className="text-primary-yellow-600 dark:text-primary-yellow-400" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-widest text-greyscale-500 dark:text-greyscale-400">
                {t('product:liveData.trendingBattles')}
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
              {t('product:liveData.trendingLenses')}
            </p>
          </div>
          <ArenaTrendingLensesWidget baseUrl={RUN_APP_URL} />
        </motion.div>
      </section>

      {/* ── HOW IT WORKS — 3 steps ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="purple" variant="outline">{t('product:flow.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('product:flow.title')}
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('product:flow.subtitle')}
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
          {FLOW_ICONS.map((Icon, i) => {
            const step = `0${i + 1}`
            const title = t(`product:flow.steps.${i}.title`)
            const description = t(`product:flow.steps.${i}.description`)
            return (
              <motion.div key={i} variants={fadeUp}>
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
            )
          })}
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
            <Card className="relative h-full space-y-4 overflow-hidden bg-white dark:bg-greyscale-900 p-8 ring-1 ring-black/5 dark:ring-white/10 shadow-2xl">
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
              <div className="relative space-y-4">
                <Badge color="yellow" variant="solid">{t('product:cta.ready.badge')}</Badge>
                <h2 className="text-2xl font-black text-greyscale-950 dark:text-greyscale-0">
                  {t('product:cta.ready.title')}
                </h2>
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  {t('product:cta.ready.description')}
                </p>
                <a href={`${RUN_APP_URL}/battles/create`}>
                  <Button variant="primary" size="lg">
                    {t('common:cta.startBattle')} <ArrowRight size={16} />
                  </Button>
                </a>
              </div>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <Card className="h-full space-y-4 p-8">
              <Badge color="yellow" variant="outline">{t('product:cta.explore.badge')}</Badge>
              <h2 className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
                {t('product:cta.explore.title')}
              </h2>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                {t('product:cta.explore.description')}
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={`${RUN_APP_URL}/battles`}>
                  <Button variant="dark" size="md">
                    {t('product:cta.explore.browseBattles')}
                  </Button>
                </a>
                <a href={contactUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="md">
                    {t('common:cta.talkToUs')} <ExternalLink size={14} />
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
