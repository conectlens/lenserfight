import { ArenaTrendingBattlesWidget, SpectatorFeedWidget } from '@lenserfight/features/battles'
import { ArenaHotThreadsWidget, ArenaTrendingLensesWidget } from '@lenserfight/features/home'
import { AiLenserFamily, HumanLenserFamily, Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { Activity, ArrowRight, ExternalLink, Music, PlayCircle, Youtube } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { PlatformPillars } from '../components/PlatformPillars'
import { chainabitContactUrl } from '../utils/chainabitUrls'

const BrandVideos = React.lazy(() => import('../components/BrandVideos'))
const DemoCinematicShowcase = React.lazy(() => import('../components/DemoCinematicShowcase'))
const ProductShowcase = React.lazy(() => import('../components/ProductShowcase'))

const RUN_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

const SOUNDTRACKS = [
  { videoId: 's-NegE5sK9o', href: 'https://youtu.be/s-NegE5sK9o' },
  {
    videoId: 'kine5GjALC0',
    href: 'https://www.youtube.com/watch?v=kine5GjALC0&list=RDkine5GjALC0',
  },
  { videoId: 'yN_44HCS1tE', href: 'https://www.youtube.com/watch?v=yN_44HCS1tE' },
  { videoId: 'FM1z-M3DD24', href: 'https://www.youtube.com/watch?v=FM1z-M3DD24' },
] as const

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 280, damping: 22 },
  },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

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

export const DemoPage: React.FC = () => {
  const { i18n, t } = useTranslation(['demo', 'common'])

  return (
    <div className="relative overflow-x-clip bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.16),_transparent_55%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.10),_transparent_50%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <Badge color="yellow" variant="outline">
              {t('demo:hero.badge')}
            </Badge>
            <span className="flex items-center gap-1.5 rounded-full bg-status-red/10 px-2.5 py-0.5 text-[11px] font-bold text-status-red">
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-status-red"
                aria-hidden="true"
              />
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

      {/* ── CINEMATIC PLATFORM TOUR — brand-style media ───────────────── */}
      <section
        aria-label={t('demo:media.title', { defaultValue: 'Platform tour' })}
        className="w-full pb-16 lg:pb-20"
      >
        <motion.div
          className="mx-auto mb-10 max-w-6xl space-y-2 px-4 sm:px-6 lg:px-8"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('demo:media.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('demo:media.headline')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('demo:media.subtitle')}
          </p>
        </motion.div>
        <React.Suspense
          fallback={
            <div className="mx-auto h-[400px] max-w-6xl animate-pulse rounded-[2.5rem] bg-surface-raised px-4" />
          }
        >
          <DemoCinematicShowcase />
        </React.Suspense>
      </section>

      {/* ── BRAND TOUR — real product screenshots, theme-aware ───────────── */}
      <section className="w-full pb-16 lg:pb-20">
        <motion.div
          className="mx-auto mb-10 max-w-6xl space-y-2 px-4 sm:px-6 lg:px-8"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('demo:brandTour.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('demo:brandTour.headline')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('demo:brandTour.subtitle')}
          </p>
        </motion.div>
        <React.Suspense
          fallback={
            <div className="mx-auto h-[400px] max-w-6xl animate-pulse rounded-[2.5rem] bg-surface-raised" />
          }
        >
          <BrandVideos />
        </React.Suspense>
      </section>

      {/* ── PRODUCT SHOWCASE — theme-aware marketing screenshots ────────── */}
      <React.Suspense fallback={<div className="h-[600px] animate-pulse bg-surface-raised" />}>
        <ProductShowcase
          i18nNamespace="demo"
          appBaseUrl={RUN_APP_URL}
          sectionHeadingLevel="h2"
          className="pb-16 lg:pb-20"
        />
      </React.Suspense>

      {/* ── EVERY PILLAR — agents, workflows, prompts, workspaces, CLI… ─ */}
      <PlatformPillars
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20"
        i18nNamespace="demo"
        i18nPrefix="pillars"
        utm={{ source: 'lenserfight', medium: 'arena_demo' }}
      />

      {/* ── LIVE WIDGETS — battles, lenses, threads ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mb-8 space-y-2"
        >
          <Badge color="red" variant="outline">
            {t('demo:widgets.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('demo:widgets.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('demo:widgets.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SpectatorFeedWidget getBattleHref={(slug) => `${RUN_APP_URL}/battles/${slug}`} />
          <ArenaTrendingBattlesWidget baseUrl={RUN_APP_URL} />
          <ArenaHotThreadsWidget baseUrl={RUN_APP_URL} />
          <ArenaTrendingLensesWidget baseUrl={RUN_APP_URL} />
        </div>
      </section>

      {/* ── Lenser Families ─────────────────────────────────────────────── */}
      <AiLenserFamily className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20" centered />
      <HumanLenserFamily
        className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20"
        centered
      />

      {/* ── Arena Soundtrack ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10 space-y-2 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            <Music size={12} className="mr-1" /> {t('demo:music.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('demo:music.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('demo:music.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-2 lg:grid-cols-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {SOUNDTRACKS.map(({ videoId, href }, i) => {
            const title = t(`demo:music.tracks.${i}.title`)
            const description = t(`demo:music.tracks.${i}.description`)
            return (
              <motion.a
                key={videoId}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                variants={cardVariant}
                whileHover={{ y: -4 }}
                className="group overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-xl transition-colors hover:border-primary-yellow-500/70 focus:outline-none focus:ring-4 focus:ring-primary-yellow-500/25"
              >
                <div className="relative aspect-video overflow-hidden bg-greyscale-900">
                  <img
                    src={`https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`}
                    alt={t('demo:music.thumbnailAlt', { title })}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950/70 via-transparent to-transparent" />
                  <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-greyscale-950/80 px-3 py-1 text-xs font-bold text-greyscale-0 ring-1 ring-white/10">
                    <Youtube size={14} className="text-status-red" />
                    {t('demo:music.musicLabel')}
                  </div>
                  <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-yellow-500 text-greyscale-900 shadow-lg shadow-primary-yellow-500/20 transition-transform group-hover:scale-105">
                    <PlayCircle size={24} />
                  </div>
                </div>
                <div className="space-y-3 p-5">
                  <h3 className="text-lg font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                    {title}
                  </h3>
                  <p className="text-sm leading-6 text-greyscale-600 dark:text-greyscale-400">
                    {description}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-greyscale-900 dark:text-greyscale-0">
                    {t('common:cta.playOnYoutube')} <ArrowRight size={14} />
                  </span>
                </div>
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
                  href={chainabitContactUrl({
                    lang: i18n.language,
                    utmMedium: 'arena_demo',
                    utmCampaign: 'demo_contact',
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="lg"
                    fullWidth
                    className="text-greyscale-600 dark:text-greyscale-300 hover:bg-black/5 dark:hover:bg-greyscale-800"
                  >
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
