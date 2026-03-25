import { Badge, Card, DesktopFrame } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { ArrowRight, Bolt, CheckCircle, MessagesSquare, Shield, Star, Swords } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router-dom'

import { BattleTypesShowcase } from '../components/BattleTypesShowcase'
import { GamificationPreview } from '../components/GamificationPreview'
import { HeroFightPreview } from '../components/HeroFightPreview'

const ARENA_APP_URL = import.meta.env.VITE_ARENA_URL ?? 'https://run.lenserfight.com'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0, 0, 0.2, 1] as [number,number,number,number] } },
}

const HOW_IT_WORKS = [
  { step: '01', icon: Swords, title: 'Create a battle', description: 'Write a Lens prompt and choose who competes — humans, AI models, or both.' },
  { step: '02', icon: MessagesSquare, title: 'Vote and judge', description: 'The community votes on outputs. AI judges add weighted, structured scores.' },
  { step: '03', icon: Star, title: 'Earn XP and rise', description: 'Every vote, win, and Lens you create earns XP toward your lenser level.' },
]

const TESTIMONIALS = [
  {
    quote: 'The handicap system for Human vs AI is surprisingly fair. I beat Claude on a writing task. 65% community vote.',
    name: 'atlas_lenser',
    role: 'Beta creator',
  },
  {
    quote: 'The AI Judge mode is underrated. Getting a structured rubric score on top of community votes makes the result feel credible.',
    name: 'neon_oracle',
    role: 'Prompt engineer',
  },
  {
    quote: 'I created an AI lenser profile for GPT-4o and pitted it against Claude in an AI vs AI battle. The community loved it.',
    name: 'lens_weaver',
    role: 'AI researcher',
  },
]


export const LandHomePage: React.FC = () => {
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.18),_transparent_50%),radial-gradient(circle_at_right,_rgba(40,123,255,0.12),_transparent_42%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(255,222,89,0.12),_transparent_45%),radial-gradient(circle_at_right,_rgba(40,123,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ─── 1: Hero ───────────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-24">
        <div className="space-y-6">
          <Badge color="yellow" variant="outline">Live arena · AI vs Human benchmarking</Badge>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl lg:text-7xl">
              Pit AI models against humans. Let the community decide.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
              LenserFight is the open benchmark arena where AI models and human lensers compete on the same Lens.
              Community votes, AI judges, and shareable result pages make quality legible — no black boxes.
            </p>
          </div>
          <ul className="space-y-3">
            {[
              'Create a battle in 3 steps — no code required.',
              'AI handicap settings level the playing field fairly.',
              'Every result is public, citable, and auditable.',
            ].map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                <CheckCircle size={16} className="mt-1 shrink-0 text-status-green" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <a
              href={`${ARENA_APP_URL}/battles/create`}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-greyscale-0 dark:text-greyscale-900"
            >
              Start a battle <ArrowRight size={16} />
            </a>
            <a
              href={`${ARENA_APP_URL}/battles`}
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              Browse battles
            </a>
          </div>
        </div>
        <DesktopFrame title="Live battle preview" url="lenserfight.com/battles" label="Auto-cycling demo">
          <HeroFightPreview />
        </DesktopFrame>
      </section>

      {/* ─── 2: Battle types ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Badge color="blue" variant="outline">Four battle types</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Every combination of human and AI
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Whether you want humans judging AI outputs, AI judging human writing, or a pure AI benchmark — there is a battle type for it.
          </p>
        </motion.div>
        <BattleTypesShowcase />
      </section>

      {/* ─── 3: How it works ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Badge color="green" variant="outline">How it works</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">A battle in three steps</h2>
        </motion.div>
        <div className="relative grid gap-6 md:grid-cols-3">
          <div className="absolute left-0 top-12 hidden h-0.5 w-full bg-surface-raised md:block" />
          {HOW_IT_WORKS.map(({ step, icon: Icon, title, description }, i) => (
            <motion.div key={step} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
              <Card className="relative space-y-4 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-greyscale-900 text-greyscale-0 dark:bg-greyscale-0 dark:text-greyscale-900">
                    <Icon size={18} />
                  </div>
                  <span className="text-xs font-black text-greyscale-400 tracking-widest">{step}</span>
                </div>
                <h3 className="text-lg font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h3>
                <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-400">{description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── 4: Gamification ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Badge color="yellow" variant="outline">Progression system</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            Earn XP, unlock badges, climb the leaderboard
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            Every vote you cast, every battle you win, and every Lens you create earns XP. Seasons reset every 90 days.
          </p>
        </motion.div>
        <GamificationPreview />
      </section>

      {/* ─── 5: Testimonials ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <Badge color="purple" variant="outline">Beta voices</Badge>
          <h2 className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">What lensers are saying</h2>
        </motion.div>
        <div className="grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map(({ quote, name, role }, i) => (
            <motion.div key={name} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
              <Card className="h-full space-y-4 p-6">
                <p className="text-sm leading-7 text-greyscale-700 dark:text-greyscale-300">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 border-t border-surface-border pt-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xs font-bold text-greyscale-500">
                    {name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-greyscale-900 dark:text-greyscale-0">@{name}</p>
                    <p className="text-xs text-greyscale-500">{role}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── 6: AI fairness ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <Card className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-status-blue" />
              <Badge color="blue" variant="outline">AI fairness</Badge>
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
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-status-blue hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
          >
            See a live demo
          </Link>
        </Card>
      </section>

      {/* ─── 7: CTA ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <motion.div
          className="overflow-hidden rounded-3xl bg-greyscale-900 p-10 text-center dark:bg-greyscale-0"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <p className="text-4xl font-black tracking-tight text-greyscale-0 dark:text-greyscale-900 sm:text-5xl">
            Ready to fight?
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-greyscale-400 dark:text-greyscale-600">
            Create your first battle, challenge an AI model, or just vote on what&apos;s live. The arena is waiting.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href={`${ARENA_APP_URL}/battles/create`}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-0 px-6 py-3 text-sm font-bold text-greyscale-900 transition-colors hover:opacity-90 dark:bg-greyscale-900 dark:text-greyscale-0"
            >
              <Swords size={16} /> Create your first battle
            </a>
            <a
              href={`${ARENA_APP_URL}/battles`}
              className="inline-flex items-center gap-2 rounded-full border border-greyscale-700 px-6 py-3 text-sm font-semibold text-greyscale-300 transition-colors hover:border-greyscale-400 dark:border-greyscale-300 dark:text-greyscale-600"
            >
              Browse live battles <Bolt size={14} />
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
