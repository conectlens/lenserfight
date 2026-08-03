import { Badge, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { CheckCircle2, ExternalLink } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { RoadmapTimeline } from '../components/RoadmapTimeline'

const GITHUB_ISSUES_URL = 'https://github.com/conectlens/lenserfight/issues/new'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const NOW_INDICES = [0, 1, 2] as const

export const RoadmapPage: React.FC = () => {
  const { t } = useTranslation(['roadmap'])

  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.16),_transparent_55%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.10),_transparent_50%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-5">
          <Badge color="yellow" variant="outline">{t('roadmap:hero.badge')}</Badge>
          <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl">
            {t('roadmap:hero.title')}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
            {t('roadmap:hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ── AVAILABLE NOW ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div className="mb-8 space-y-2" variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="green" variant="outline">{t('roadmap:now.badge')}</Badge>
          <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('roadmap:now.title')}
          </h2>
        </motion.div>
        <motion.div className="grid gap-4 md:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={viewport}>
          {NOW_INDICES.map((i) => (
            <motion.div key={i} variants={fadeUp}>
              <Card className="h-full space-y-3 p-6">
                <CheckCircle2 size={20} className="text-status-green" />
                <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">
                  {t(`roadmap:now.items.${i}.title`)}
                </h3>
                <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                  {t(`roadmap:now.items.${i}.description`)}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ── TIMELINE ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <RoadmapTimeline />
      </section>

      {/* ── WHY WE PUBLISH THIS ────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={viewport} transition={spring}>
          <Card className="space-y-3 p-8 bg-white dark:bg-surface-raised ring-1 ring-black/5 dark:ring-white/10">
            <h2 className="text-xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              {t('roadmap:note.title')}
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              {t('roadmap:note.description')}
            </p>
          </Card>
        </motion.div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <Card className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                {t('roadmap:cta.title')}
              </h2>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                {t('roadmap:cta.description')}
              </p>
            </div>
            <a href={GITHUB_ISSUES_URL} target="_blank" rel="noopener noreferrer">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-yellow-500 px-6 py-3 text-sm font-bold text-greyscale-900 transition-all hover:bg-primary-yellow-400 hover:scale-105">
                {t('roadmap:cta.github')} <ExternalLink size={14} />
              </div>
            </a>
          </Card>
        </motion.div>
      </section>
    </div>
  )
}
