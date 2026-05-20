import { Badge, Card } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, CheckCircle, Heart, MessagesSquare, Shield, Star, Swords } from 'lucide-react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { ArenaPulseSection } from '../components/ArenaPulseSection'
import { BattleTypesShowcase } from '../components/BattleTypesShowcase'
import { GamificationPreview } from '../components/GamificationPreview'
import { HotThreadsSection } from '../components/HotThreadsSection'
import { WaitlistForm } from '../components/WaitlistForm'

const HomeTour = React.lazy(() => import('../components/HomeTour'))
const ProductShowcase = React.lazy(() => import('../components/ProductShowcase'))

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

          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
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
          className="flex items-center justify-center"
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring, delay: 0.12 }}
        >
          <video 
            src="https://cdn.lenserfight.com/product/videos/introduction.mp4" 
            width="720" 
            alt="LenserFight — AI Prompt Framework & Workflow Engine & AI Benchmarking & AI Forum & Agent Lab & Agent Playground & Community-Driven Evaluations & AI Agents " 
            autoPlay 
            muted 
            loop 
            playsInline 
            className="rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] ring-1 ring-black/10 dark:ring-white/10"
          />
        </motion.div>
      </section>

      {/* ─── 2: Battle types ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          className="mb-8 space-y-2"
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('home:battleTypes.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:battleTypes.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('home:battleTypes.subtitle')}
          </p>
        </motion.div>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <BattleTypesShowcase />
        </motion.div>
      </section>

      {/* ─── 3: How it works ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          className="mb-8 space-y-2"
          variants={fadeRight}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="green" variant="outline">
            {t('home:howItWorks.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:howItWorks.title')}
          </h2>
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
                    <span className="text-xs font-black tracking-widest text-greyscale-400">
                      {step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">
                    {title}
                  </h3>
                  <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
                    {description}
                  </p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ─── 3.7: Arena Pulse (live real-time data) ──────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <ArenaPulseSection />
      </section>

      {/* ─── 3.2: Platform Tour ─────────────────────────────────────── */}
      <section className="w-full pb-16 lg:pb-20">
        <motion.div
          className="mx-auto mb-10 max-w-6xl space-y-2 px-4 sm:px-6 lg:px-8"
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('home:homeTour.tag')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('home:homeTour.title')}
          </h2>
        </motion.div>
        <React.Suspense
          fallback={
            <div className="mx-auto h-[400px] max-w-6xl animate-pulse rounded-[2.5rem] bg-surface-raised" />
          }
        >
          <HomeTour />
        </React.Suspense>
      </section>

      {/* ─── 3.5: Product Showcase ──────────────────────────────────── */}
      <React.Suspense fallback={<div className="h-[600px] animate-pulse bg-surface-raised" />}>
        <ProductShowcase
          i18nNamespace="home"
          appBaseUrl={ARENA_APP_URL}
          sectionHeadingLevel="h2"
          className="pb-16 lg:pb-20"
        />
      </React.Suspense>

      {/* ─── 4: Gamification ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          className="mb-8 space-y-2"
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('home:gamification.badge')}
          </Badge>
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
                <Badge color="yellow" variant="outline">
                  {t('home:fairness.badge')}
                </Badge>
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
              whileHover={{
                scale: 1.05,
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-8 py-3.5 text-sm font-bold text-greyscale-900 shadow-lg shadow-primary-yellow-500/20 transition-all hover:bg-primary-yellow-400"
            >
              <Swords size={18} /> {t('common:cta.createFirstBattle')}
            </motion.a>
            <motion.a
              href={`${ARENA_APP_URL}/battles`}
              variants={cardVariant}
              whileHover={{
                scale: 1.05,
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-full border-2 border-greyscale-200 dark:border-greyscale-700 bg-transparent px-8 py-3 text-sm font-bold text-greyscale-700 dark:text-greyscale-300 transition-all hover:border-primary-yellow-500 hover:text-greyscale-950 dark:hover:border-greyscale-400 dark:hover:text-greyscale-0"
            >
              {t('common:cta.browseBattles')} <ArrowRight size={18} />
            </motion.a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
