import { AiLenserFamily, Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Bolt, CheckCircle, Heart, MessagesSquare, Music, PlayCircle, Shield, Star, Swords, Youtube } from 'lucide-react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { ArenaPulseSection } from '../components/ArenaPulseSection'
import { BattleTypesShowcase } from '../components/BattleTypesShowcase'
import { GamificationPreview } from '../components/GamificationPreview'
import { HeroFightPreview } from '../components/HeroFightPreview'
import { HotThreadsSection } from '../components/HotThreadsSection'
import { WaitlistForm } from '../components/WaitlistForm'

const BrandVideos = React.lazy(() => import('../components/BrandVideos'))

const ARENA_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/conectlens'

// ── Shared animation variants ────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 280, damping: 22 } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const fadeRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const cardVariant = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring },
}

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
}

const viewport = { once: true, margin: '-60px' }

// ── Static data ──────────────────────────────────────────────────────────────

const HERO_BULLET_INDICES = [0, 1, 2] as const
const HOW_IT_WORKS_ICONS = [Swords, MessagesSquare, Star] as const
const SOUNDTRACKS = [
  { videoId: 'kine5GjALC0', href: 'https://www.youtube.com/watch?v=kine5GjALC0&list=RDkine5GjALC0' },
  { videoId: 'yN_44HCS1tE', href: 'https://www.youtube.com/watch?v=yN_44HCS1tE' },
  { videoId: 'FM1z-M3DD24', href: 'https://www.youtube.com/watch?v=FM1z-M3DD24' },
] as const


// ── Page ─────────────────────────────────────────────────────────────────────

export const LandHomePage: React.FC = () => {
  const { t } = useTranslation(['home', 'common'])
  const heroRef = useRef<HTMLElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, -60])

  return (
    <div className="relative overflow-x-clip bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.18),_transparent_50%),radial-gradient(circle_at_right,_rgba(40,123,255,0.12),_transparent_42%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(40,123,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ─── 1: Hero ───────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-24"
      >
        <motion.div className="space-y-6" style={{ y: heroY }}>
          {/* Floating badge */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block"
            >
              <Badge color="yellow" variant="outline">{t('common:badges.liveArena')}</Badge>
            </motion.div>
          </motion.div>

          <motion.div className="space-y-4" variants={fadeUp} initial="hidden" animate="visible">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
              {t('home:hero.headline')}
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
              {t('home:hero.subheadline')}
            </p>
          </motion.div>

          <motion.ul
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {HERO_BULLET_INDICES.map((i) => {
              const point = t(`home:hero.bullets.${i}`)
              return (
                <motion.li
                  key={i}
                  variants={fadeLeft}
                  className="flex items-start gap-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400"
                >
                  <CheckCircle size={16} className="mt-1 shrink-0 text-status-green" />
                  <span>{point}</span>
                </motion.li>
              )
            })}
          </motion.ul>

          <motion.div variants={fadeUp} initial="hidden" animate="visible" transition={{ delay: 0.2 }}>
            <WaitlistForm />
          </motion.div>

          <motion.a
            href={`${ARENA_APP_URL}/battles`}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.28 }}
            className="inline-flex items-center gap-2 text-sm font-medium text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-0"
          >
            {t('common:cta.browseBattles')} <ArrowRight size={14} />
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring, delay: 0.12 }}
        >
          <DesktopFrame title={t('home:preview.demoTitle')} url="lenserfight.com/battles" label={t('home:preview.demoFrameLabel')}>
            <HeroFightPreview />
          </DesktopFrame>
        </motion.div>
      </section>


      {/* ─── 3.5: AI Lenser Family ──────────────────────────────────── */}
      <AiLenserFamily className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20" centered />


      {/* ─── 2: Battle types ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">{t('home:battleTypes.badge')}</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:battleTypes.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:battleTypes.subtitle')}
          </p>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={viewport}>
          <BattleTypesShowcase />
        </motion.div>
      </section>

      {/* ─── 3: How it works ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeRight} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="green" variant="outline">{t('home:howItWorks.badge')}</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">{t('home:howItWorks.title')}</h2>
        </motion.div>
        <motion.div
          className="relative grid gap-5 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div className="absolute inset-x-0 top-10 hidden h-px bg-surface-border md:block" />
          {HOW_IT_WORKS_ICONS.map((Icon, i) => {
            const step = `0${i + 1}`
            const title = t(`home:howItWorks.steps.${i}.title`)
            const description = t(`home:howItWorks.steps.${i}.description`)
            return (
              <motion.div key={i} variants={cardVariant}>
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

      {/* ─── 3.2: Brand Motion ──────────────────────────────────────── */}
      <section className="w-full pb-16 lg:pb-20">
        <motion.div
          className="mx-auto mb-10 max-w-6xl space-y-2 px-4 sm:px-6 lg:px-8"
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('home:brandMotion.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:brandMotion.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:brandMotion.subtitle')}
          </p>
        </motion.div>
        <React.Suspense
          fallback={
            <div className="mx-auto h-[400px] max-w-6xl animate-pulse rounded-[2.5rem] bg-surface-raised px-4" />
          }
        >
          <BrandVideos />
        </React.Suspense>
      </section>

      {/* ─── 3.7: Arena Pulse (live real-time data) ──────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <ArenaPulseSection />
      </section>

      {/* ─── 4: Gamification ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">{t('home:gamification.badge')}</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:gamification.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:gamification.subtitle')}
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <GamificationPreview />
        </motion.div>
      </section>

      {/* ─── 5: Hot threads ─────────────────────────────────────────── */}
      <HotThreadsSection />

      {/* ─── 6: AI fairness ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={spring}
        >
          <Card className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center bg-white dark:bg-surface-raised ring-1 ring-black/5 dark:ring-white/10">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[var(--cl-yellow-500)]" />
                <Badge color="yellow" variant="outline">{t('home:fairness.badge')}</Badge>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                {t('home:fairness.title')}
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                {t('home:fairness.description')}
              </p>
            </div>
            <Link
              to="/battle-showcase"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              {t('common:cta.seeDemo')}
            </Link>
          </Card>
        </motion.div>
      </section>

      {/* ─── Sponsor ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <motion.div
          className="flex flex-col items-center gap-4 rounded-2xl border border-surface-border bg-surface-raised px-8 py-8 text-center sm:flex-row sm:justify-between sm:text-left"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={spring}
        >
          <div className="space-y-1">
            <p className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">
              {t('home:sponsor.title')}
            </p>
            <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
              {t('home:sponsor.description')}
            </p>
          </div>
          <a
            href={`${GITHUB_SPONSORS_URL}?utm_source=lenserfight&utm_medium=land_banner&utm_campaign=sponsor_cta`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-yellow-500 px-6 py-2.5 text-sm font-bold text-greyscale-900 transition-all hover:bg-primary-yellow-400 hover:scale-105"
          >
            <Heart size={15} /> {t('common:cta.sponsorUs')}
          </a>
        </motion.div>
      </section>

      {/* ─── 7: CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-white dark:bg-greyscale-900 p-10 text-center ring-1 ring-black/5 dark:ring-white/10 shadow-2xl"
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          {/* Subtle animated background gradient */}
          <motion.div
            className="pointer-events-none absolute inset-0 opacity-20"
            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            style={{
              background: 'linear-gradient(270deg, #ffd447, #287bff, #ffd447)',
              backgroundSize: '200% 200%',
            }}
          />
          <h2 className="relative text-4xl font-black tracking-tight text-greyscale-950 dark:text-greyscale-0 sm:text-5xl">
            {t('home:cta.title')}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:cta.description')}
          </p>
          <motion.div
            className="relative mt-8 flex flex-wrap items-center justify-center gap-4"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
              <motion.a
                href={`${ARENA_APP_URL}/battles/create`}
                variants={cardVariant}
                whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-8 py-3.5 text-sm font-bold text-greyscale-900 shadow-lg shadow-primary-yellow-500/20 transition-all hover:bg-primary-yellow-400"
              >
              <Swords size={18} /> {t('common:cta.createFirstBattle')}
            </motion.a>
              <motion.a
                href={`${ARENA_APP_URL}/battles`}
                variants={cardVariant}
                whileHover={{ scale: 1.05, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex items-center gap-2 rounded-full border-2 border-greyscale-200 dark:border-greyscale-700 bg-transparent px-8 py-3 text-sm font-bold text-greyscale-700 dark:text-greyscale-300 transition-all hover:border-primary-yellow-500 hover:text-greyscale-950 dark:hover:border-greyscale-400 dark:hover:text-greyscale-0"
              >
              {t('common:cta.browseBattles')} <ArrowRight size={18} />
            </motion.a>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── 8: YouTube Music Section ──────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          className="mb-10 space-y-2 text-center"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            <Music size={12} className="mr-1" /> {t('home:music.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:music.title')}
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:music.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="grid gap-5 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {SOUNDTRACKS.map(({ videoId, href }, i) => {
            const title = t(`home:music.tracks.${i}.title`)
            const description = t(`home:music.tracks.${i}.description`)
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
                  alt={t('home:soundtracks.thumbnailAlt', { title })}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-greyscale-950/70 via-transparent to-transparent" />
                <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-greyscale-950/80 px-3 py-1 text-xs font-bold text-greyscale-0 ring-1 ring-white/10">
                  <Youtube size={14} className="text-status-red" />
                  {t('home:soundtracks.musicLabel')}
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
    </div>
  )
}
