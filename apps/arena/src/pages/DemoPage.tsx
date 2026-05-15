import {
  ArenaTrendingBattlesWidget,
  SpectatorFeedWidget,
} from '@lenserfight/features/battles'
import {
  ArenaHotThreadsWidget,
  ArenaTrendingLensesWidget,
} from '@lenserfight/features/home'
import { Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  Activity,
  Aperture,
  ArrowRight,
  Brain,
  ExternalLink,
  Flame,
  MessageSquare,
  Radio,
  Sparkles,
  User,
  Workflow,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { chainabitContactUrl } from '../utils/chainabitUrls'

const RUN_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const PRIMITIVE_LINKS = [
  { icon: User, key: 'lensers', href: `${RUN_APP_URL}/lensers?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=lensers` },
  { icon: Aperture, key: 'lenses', href: `${RUN_APP_URL}/lenses?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=lenses` },
  { icon: Workflow, key: 'workflows', href: `${RUN_APP_URL}/workflows?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=workflows` },
  { icon: Brain, key: 'agents', href: `${RUN_APP_URL}/agents?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=agents` },
] as const

export const DemoPage: React.FC = () => {
  const { i18n, t } = useTranslation(['demo', 'common'])

  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.16),_transparent_55%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.10),_transparent_50%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="space-y-6"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <Badge color="yellow" variant="outline">{t('demo:hero.badge')}</Badge>
            <span className="flex items-center gap-1.5 rounded-full bg-status-red/10 px-2.5 py-0.5 text-[11px] font-bold text-status-red">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-red" aria-hidden="true" />
              {t('common:badges.realData')}
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="max-w-4xl text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl"
          >
            {t('demo:hero.title')}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400"
          >
            {t('demo:hero.subtitle')}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <a
              href={`${RUN_APP_URL}/battles?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=demo_browse_battles`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="lg">
                {t('common:cta.openArena')} <ArrowRight size={16} />
              </Button>
            </a>
            <Link to="/product">
              <Button variant="secondary" size="lg">
                {t('common:cta.seePrimitives')}
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ── LIVE WIDGETS — battles, lenses, threads ─────────────────────── */}
      <section className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        {/* Live battles — Supabase realtime */}
        <SpectatorFeedWidget
          getBattleHref={(slug) => `${RUN_APP_URL}/battles/${slug}`}
        />

        {/* Hot / trending battles */}
        <ArenaTrendingBattlesWidget baseUrl={RUN_APP_URL} />

        {/* Hot threads */}
        <ArenaHotThreadsWidget baseUrl={RUN_APP_URL} />

        {/* Trending lenses */}
        <ArenaTrendingLensesWidget baseUrl={RUN_APP_URL} />
      </section>

      {/* ── EXPLORE THE REST OF THE PLATFORM ───────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="purple" variant="outline">{t('demo:explore.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('demo:explore.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('demo:explore.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {PRIMITIVE_LINKS.map(({ icon: Icon, key, href }) => {
            const title = t(`demo:explore.items.${key}.title`)
            const description = t(`demo:explore.items.${key}.description`)
            return (
              <motion.a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                variants={fadeUp}
                className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500 rounded-2xl"
              >
                <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-shadow hover:border-t-primary-yellow-500 hover:shadow-md">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                    <Icon size={20} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-1.5 text-base font-bold text-greyscale-900 dark:text-greyscale-50">
                      {title}
                      <ExternalLink size={12} className="text-greyscale-400 transition-colors group-hover:text-greyscale-700 dark:group-hover:text-greyscale-200" />
                    </h3>
                    <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">{description}</p>
                  </div>
                </Card>
              </motion.a>
            )
          })}
        </motion.div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <Card className="relative overflow-hidden bg-white dark:bg-greyscale-900 p-10 ring-1 ring-black/5 dark:ring-white/10 shadow-2xl">
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
            <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="space-y-4">
                <Activity size={28} className="text-primary-yellow-500" />
                <h2 className="text-2xl font-black leading-tight tracking-tight text-greyscale-950 dark:text-greyscale-0 sm:text-3xl">
                  {t('demo:cta.title')}
                </h2>
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  {t('demo:cta.description')}
                </p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-shrink-0">
                <a
                  href={`${RUN_APP_URL}/battles/create?utm_source=lenserfight&utm_medium=arena_demo&utm_campaign=demo_create_battle`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="lg" fullWidth>
                    {t('common:cta.createBattle')} <ArrowRight size={16} />
                  </Button>
                </a>
                <a
                  href={chainabitContactUrl({ lang: i18n.language, utmMedium: 'arena_demo', utmCampaign: 'demo_contact' })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="lg" fullWidth className="text-greyscale-600 dark:text-greyscale-300 hover:bg-black/5 dark:hover:bg-greyscale-800">
                    {t('common:cta.contactUs')} <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  )
}
