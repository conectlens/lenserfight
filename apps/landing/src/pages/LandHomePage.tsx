import {
  Accordion,
  AiLenserFamily,
  Badge,
  Card,
  DesktopFrame,
  HumanLenserFamily,
} from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  Clock,
  Heart,
  // eslint-disable-next-line deprecation/deprecation
  Github,
  Sparkles,
  Star,
  Workflow,
} from 'lucide-react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { ArenaPulseSection } from '../components/ArenaPulseSection'
import { GamificationPreview } from '../components/GamificationPreview'
import { HeroDemoPlayer } from '../components/HeroDemoPlayer'
import { HotThreadsSection } from '../components/HotThreadsSection'
import { WaitlistForm } from '../components/WaitlistForm'

const HomeTour = React.lazy(() => import('../components/HomeTour'))
const ProductShowcase = React.lazy(() => import('../components/ProductShowcase'))

const WEB_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'
const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/conectlens'
const GITHUB_URL = 'https://github.com/conectlens/lenserfight'

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
const GLOSSARY_TERM_INDICES = [0, 1, 2, 3] as const
const HOW_IT_WORKS_ICONS = [Sparkles, Workflow, Star] as const
const ROADMAP_PHASE_INDICES = [0, 1, 2] as const
const FAQ_TEASER_ENTRIES = [
  { group: 'trust', id: 'isItReady' },
  { group: 'product', id: 'whatIs' },
  { group: 'trust', id: 'roadmap' },
  { group: 'product', id: 'whatIsWorkflow' },
  { group: 'platform', id: 'pricing' },
  { group: 'voting', id: 'resultsPermanent' },
] as const

// ── Page ─────────────────────────────────────────────────────────────────────

export const LandHomePage: React.FC = () => {
  const { t } = useTranslation(['home', 'common', 'roadmap', 'faq'])
  const heroRef = useRef<HTMLElement>(null)
  const { scrollY } = useScroll()
  const heroY = useTransform(scrollY, [0, 400], [0, -60])

  return (
    <div className="relative overflow-x-clip bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.18),_transparent_50%),radial-gradient(circle_at_right,_rgba(40,123,255,0.12),_transparent_42%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(40,123,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ─── 1: Hero ───────────────────────────────────────────────── */}
      <section ref={heroRef} className="py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[40rem_1fr] lg:items-center">
            <motion.div className="space-y-6 lg:pr-8" style={{ y: heroY }}>
              <motion.div
                className="space-y-4"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
              >
                <h1 className="max-w-3xl text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
                  {t('home:hero.headline')}
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
                  {t('home:hero.subheadline')}
                </p>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                <WaitlistForm />
              </motion.div>

              <motion.div
                className="flex flex-wrap items-center gap-4"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.28 }}
              >
                <a
                  href={`${WEB_APP_URL}/lenses`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-greyscale-900 transition-colors hover:text-primary-yellow-600 dark:text-greyscale-0"
                >
                  {t('common:cta.createFirstLens')} <ArrowRight size={14} />
                </a>
                <a
                  href={`${WEB_APP_URL}/workflows`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-greyscale-500 transition-colors hover:text-greyscale-900 dark:hover:text-greyscale-0"
                >
                  {t('common:cta.createFirstWorkflow')} <ArrowRight size={14} />
                </a>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ ...spring, delay: 0.12 }}
              className="w-full lg:w-[800px] xl:w-[1000px] 2xl:w-[1200px]"
            >
              <DesktopFrame
                title={t('home:preview.demoTitle')}
                url={t('home:preview.demoUrl')}
                label={t('home:preview.demoFrameLabel')}
              >
                <HeroDemoPlayer alt={t('home:preview.demoFrameLabel')} width={1120} height={700} />
              </DesktopFrame>
            </motion.div>
          </div>
        </div>
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
          appBaseUrl={WEB_APP_URL}
          sectionHeadingLevel="h2"
          showBattleCard={false}
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

      {/* ─── Sponsor & Contribute ───────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-2">
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

          <motion.div
            className="flex flex-col items-center gap-4 rounded-2xl border border-surface-border bg-surface-raised px-8 py-8 text-center sm:flex-row sm:justify-between sm:text-left"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewport}
            transition={{ ...spring, delay: 0.08 }}
          >
            <div className="space-y-1">
              <p className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">
                {t('home:contribute.title')}
              </p>
              <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
                {t('home:contribute.description')}
              </p>
            </div>
            <a
              href={`${GITHUB_URL}?utm_source=lenserfight&utm_medium=land_banner&utm_campaign=contribute_cta`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border-2 border-greyscale-900 bg-transparent px-6 py-2.5 text-sm font-bold text-greyscale-900 transition-all hover:bg-greyscale-900 hover:text-greyscale-0 hover:scale-105 dark:border-greyscale-0 dark:text-greyscale-0 dark:hover:bg-greyscale-0 dark:hover:text-greyscale-900"
            >
              <Github size={15} /> {t('common:cta.letsContribute')}
            </a>
          </motion.div>
        </div>
      </section>

      {/* ─── 6.5: Roadmap teaser ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          className="mb-8 space-y-2"
          variants={fadeLeft}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('roadmap:timeline.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('roadmap:hero.title')}
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('roadmap:hero.subtitle')}
          </p>
          <p className="max-w-2xl text-sm font-medium leading-7 text-greyscale-700 dark:text-greyscale-300">
            {t('home:roadmapSummary')}
          </p>
        </motion.div>
        <motion.div
          className="grid gap-4 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {ROADMAP_PHASE_INDICES.map((i) => {
            const status = t(`roadmap:timeline.phases.${i}.status`)
            const Icon = status === 'in_progress' ? Clock : Sparkles
            return (
              <motion.div key={i} variants={cardVariant}>
                <Card className="h-full space-y-3 p-6">
                  <div className="flex items-center justify-between">
                    <Badge color={status === 'in_progress' ? 'yellow' : 'green'} variant="outline">
                      <Icon size={12} className="mr-1 inline" />
                      {t(`roadmap:timeline.statusLabels.${status}`)}
                    </Badge>
                    <span className="font-mono text-[11px] font-black uppercase tracking-widest text-greyscale-400">
                      {t(`roadmap:timeline.phases.${i}.period`)}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">
                    {t(`roadmap:timeline.phases.${i}.title`)}
                  </h3>
                  <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">
                    {t(`roadmap:timeline.phases.${i}.description`)}
                  </p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewport}
        >
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-2 text-sm font-semibold text-greyscale-700 transition-colors hover:text-primary-yellow-600 dark:text-greyscale-300"
          >
            {t('common:cta.viewRoadmap')} <ArrowRight size={14} />
          </Link>
        </motion.div>
      </section>

      {/* ─── 6.7: FAQ teaser ────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div
          className="mb-8 space-y-2"
          variants={fadeRight}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <Badge color="yellow" variant="outline">
            {t('faq:hero.badge')}
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('faq:hero.title')}
          </h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={spring}
        >
          <Accordion type="single">
            {FAQ_TEASER_ENTRIES.map(({ group, id }) => (
              <Accordion.Item
                key={`${group}.${id}`}
                title={t(`faq:groups.${group}.entries.${id}.title`)}
              >
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  {t(`faq:groups.${group}.entries.${id}.body`)}
                </p>
              </Accordion.Item>
            ))}
          </Accordion>
        </motion.div>
        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={viewport}
        >
          <Link
            to="/faq"
            className="inline-flex items-center gap-2 text-sm font-semibold text-greyscale-700 transition-colors hover:text-primary-yellow-600 dark:text-greyscale-300"
          >
            {t('common:cta.readFaq')} <ArrowRight size={14} />
          </Link>
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
              href={`${WEB_APP_URL}/lenses`}
              variants={cardVariant}
              whileHover={{
                scale: 1.05,
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-8 py-3.5 text-sm font-bold text-greyscale-900 shadow-lg shadow-primary-yellow-500/20 transition-all hover:bg-primary-yellow-400"
            >
              <Sparkles size={18} /> {t('common:cta.createFirstLens')}
            </motion.a>
            <motion.a
              href={`${WEB_APP_URL}/workflows`}
              variants={cardVariant}
              whileHover={{
                scale: 1.05,
                transition: { type: 'spring', stiffness: 400, damping: 20 },
              }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-full border-2 border-greyscale-200 dark:border-greyscale-700 bg-transparent px-8 py-3 text-sm font-bold text-greyscale-700 dark:text-greyscale-300 transition-all hover:border-primary-yellow-500 hover:text-greyscale-950 dark:hover:border-greyscale-400 dark:hover:text-greyscale-0"
            >
              {t('common:cta.createFirstWorkflow')} <ArrowRight size={18} />
            </motion.a>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
