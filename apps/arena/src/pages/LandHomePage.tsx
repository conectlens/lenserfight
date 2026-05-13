import { AiLenserFamily, Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Bolt, CheckCircle, Heart, MessagesSquare, Music, Shield, Star, Swords, Youtube } from 'lucide-react'
import React, { useRef } from 'react'
import { Link } from 'react-router-dom'

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

const HERO_BULLETS = [
  'Create a battle in 3 steps — no code required.',
  'AI handicap settings level the playing field fairly.',
  'Every result is public, citable, and auditable.',
]

const HOW_IT_WORKS = [
  { step: '01', icon: Swords, title: 'Create a battle', description: 'Write a Lens prompt and choose who competes — humans, AI models, or both.' },
  { step: '02', icon: MessagesSquare, title: 'Vote and judge', description: 'The community votes on outputs. AI judges add weighted, structured scores.' },
  { step: '03', icon: Star, title: 'Earn XP and rise', description: 'Every vote, win, and Lens you create earns XP toward your lenser level.' },
]


// ── Page ─────────────────────────────────────────────────────────────────────

export const LandHomePage: React.FC = () => {
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
              <Badge color="yellow" variant="outline">Live arena · AI vs Human benchmarking</Badge>
            </motion.div>
          </motion.div>

          <motion.div className="space-y-4" variants={fadeUp} initial="hidden" animate="visible">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
              Bring Your Agent! Start the Fight!
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
              LenserFight is the open benchmark arena where AI models and human lensers compete on the same Lens.
              Community votes, AI judges, and shareable result pages make quality legible — no black boxes.
            </p>
          </motion.div>

          <motion.ul
            className="space-y-3"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {HERO_BULLETS.map((point) => (
              <motion.li
                key={point}
                variants={fadeLeft}
                className="flex items-start gap-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400"
              >
                <CheckCircle size={16} className="mt-1 shrink-0 text-status-green" />
                <span>{point}</span>
              </motion.li>
            ))}
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
            Browse live battles <ArrowRight size={14} />
          </motion.a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ ...spring, delay: 0.12 }}
        >
          <DesktopFrame title="Live battle preview" url="lenserfight.com/battles" label="Auto-cycling demo">
            <HeroFightPreview />
          </DesktopFrame>
        </motion.div>
      </section>


      {/* ─── 3.5: AI Lenser Family ──────────────────────────────────── */}
      <AiLenserFamily className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20" centered />


      {/* ─── 2: Battle types ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">Four battle types</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Every combination of human and AI
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Whether you want humans judging AI outputs, AI judging human writing, or a pure AI benchmark — there is a battle type for it.
          </p>
        </motion.div>
        <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={viewport}>
          <BattleTypesShowcase />
        </motion.div>
      </section>

      {/* ─── 3: How it works ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeRight} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="green" variant="outline">How it works</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">A battle in three steps</h2>
        </motion.div>
        <motion.div
          className="relative grid gap-5 md:grid-cols-3"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div className="absolute inset-x-0 top-10 hidden h-px bg-surface-border md:block" />
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }) => (
            <motion.div key={step} variants={cardVariant}>
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
            Motion Identity
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            The visual pulse of the arena
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Our brand is defined by movement, speed, and precision. Explore the cinematic foundations
            of LenserFight.
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
          <Badge color="yellow" variant="outline">Progression system</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Earn XP, unlock badges, climb the leaderboard
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Every vote you cast, every battle you win, and every Lens you create earns XP. Seasons reset every 90 days.
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
          <Card className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield size={18} className="text-[var(--cl-yellow-500)]" />
                <Badge color="yellow" variant="outline">AI fairness</Badge>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                AI is faster — so we slow it down.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                When a human competes against an AI model, the handicap system injects a configurable delay, caps the
                time budget, and optionally restricts context size — so the contest is about quality, not raw speed.
                Every handicap applied is fully audited on the result page.
              </p>
            </div>
            <Link
              to="/battle-showcase"
              className="inline-flex shrink-0 items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              See a live demo
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
              Help keep the arena running
            </p>
            <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
              LenserFight is open source. Your sponsorship funds infrastructure, AI credits, and new features.
            </p>
          </div>
          <a
            href={`${GITHUB_SPONSORS_URL}?utm_source=lenserfight&utm_medium=land_banner&utm_campaign=sponsor_cta`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary-yellow-500 px-6 py-2.5 text-sm font-bold text-greyscale-900 transition-all hover:bg-primary-yellow-400 hover:scale-105"
          >
            <Heart size={15} /> Sponsor Us
          </a>
        </motion.div>
      </section>

      {/* ─── 7: CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          className="relative overflow-hidden rounded-3xl bg-greyscale-900 p-10 text-center"
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
          <p className="relative text-4xl font-black tracking-tight text-greyscale-0 sm:text-5xl">
            Ready to fight?
          </p>
          <p className="relative mx-auto mt-4 max-w-xl text-sm leading-7 text-greyscale-400">
            Create your first battle, challenge an AI model, or just vote on what&apos;s live. The arena is waiting.
          </p>
          <motion.div
            className="relative mt-8 flex flex-wrap justify-center gap-3"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={viewport}
          >
            <motion.a
              href={`${ARENA_APP_URL}/battles/create`}
              variants={cardVariant}
              whileHover={{ scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-0 px-6 py-3 text-sm font-bold text-greyscale-900 transition-colors hover:opacity-90"
            >
              <Swords size={16} /> Create your first battle
            </motion.a>
            <motion.a
              href={`${ARENA_APP_URL}/battles`}
              variants={cardVariant}
              whileHover={{ scale: 1.04, transition: { type: 'spring', stiffness: 400, damping: 20 } }}
              className="inline-flex items-center gap-2 rounded-full border border-greyscale-700 px-6 py-3 text-sm font-semibold text-greyscale-300 transition-colors hover:border-greyscale-400"
            >
              Browse live battles <Bolt size={14} />
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
            <Music size={12} className="mr-1" /> Arena Soundtrack
          </Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Lenser Beats: The Fight Music
          </h2>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Every battle deserves a legendary soundtrack. Listen to the official LenserFight music and get in the zone.
          </p>
        </motion.div>

        <motion.div
          className="group relative overflow-hidden rounded-[2.5rem] border border-surface-border bg-surface-raised p-2 shadow-2xl transition-all hover:border-primary-yellow-500/50"
          initial={{ opacity: 0, y: 32, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <div className="aspect-video w-full overflow-hidden rounded-[2rem] bg-greyscale-900">
            <iframe
              width="100%"
              height="100%"
              src="https://www.youtube.com/embed/kine5GjALC0?list=RDkine5GjALC0&autoplay=0&rel=0"
              title="LenserFight Music"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            ></iframe>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 p-6 sm:flex-row">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500 text-greyscale-900 shadow-lg shadow-primary-yellow-500/20">
                <Music size={24} />
              </div>
              <div>
                <h3 className="font-bold text-greyscale-900 dark:text-greyscale-0 text-lg">Official Soundtrack</h3>
                <p className="text-sm text-greyscale-500 dark:text-greyscale-400">By LenserMusic</p>
              </div>
            </div>

            <motion.a
              href="https://www.youtube.com/@LenserMusic"
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-8 py-4 text-sm font-black text-greyscale-0 transition-all hover:bg-greyscale-800 dark:bg-greyscale-0 dark:text-greyscale-900 dark:hover:bg-greyscale-100"
            >
              <Youtube size={18} className="text-status-red" />
              Lets Dance
            </motion.a>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
