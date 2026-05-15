import { Badge, Button, Card } from '@lenserfight/ui/components'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Heart, Lightbulb, Quote, Sparkles, Youtube } from 'lucide-react'
import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { FounderDukkanVideo } from '../components/FounderDukkanVideo'

const YOUTUBE_URL = 'https://www.youtube.com/@ofcskn'

const spring = { type: 'spring', stiffness: 100, damping: 15 } as const
const viewport = { once: true, margin: '-100px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { ...spring, duration: 0.8 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
}

const NOTE_ICONS = [Lightbulb, Heart, Sparkles] as const

export const FounderNotePage: React.FC = () => {
  const { t } = useTranslation(['founderNote', 'common'])
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const backgroundY = useTransform(scrollYProgress, [0, 1], ['0%', '10%'])

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen overflow-x-clip bg-surface-base text-surface-text selection:bg-primary-yellow-500/30"
    >
      {/* Premium Background Elements */}
      <motion.div
        style={{ y: backgroundY }}
        className="absolute inset-x-0 top-0 -z-10 h-[60rem] pointer-events-none"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,rgba(255,222,89,0.15),transparent_70%)] dark:bg-[radial-gradient(circle_at_50%_-20%,rgba(255,222,89,0.08),transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] brightness-100 contrast-150" />
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:32px_32px]" />
      </motion.div>

      <section className="mx-auto max-w-7xl px-4 pt-24 pb-20 sm:px-6 lg:px-8 lg:pt-32 lg:pb-32">
        <motion.div
          className="grid gap-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-10">
            <motion.div variants={fadeUp}>
              <Badge
                color="yellow"
                variant="outline"
                className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] border-primary-yellow-500/30 text-primary-yellow-600 dark:text-primary-yellow-400 backdrop-blur-sm"
              >
                {t('founderNote:hero.badge')}
              </Badge>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-6">
              <h1 className="text-6xl font-black tracking-tighter text-greyscale-900 dark:text-greyscale-0 sm:text-7xl lg:text-8xl leading-[0.9]">
                {t('founderNote:hero.headline')} <span className="text-primary-yellow-500">{t('founderNote:hero.headlineHighlight')}</span>
              </h1>
              <p className="max-w-xl text-xl leading-relaxed text-greyscale-600 dark:text-greyscale-400 font-medium">
                {t('founderNote:hero.subtitle')}
              </p>
            </motion.div>

            <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
              <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
                <Button
                  variant="primary"
                  size="lg"
                  className="h-14 px-8 rounded-2xl shadow-[0_20px_40px_-12px_rgba(234,179,8,0.3)] hover:shadow-[0_25px_50px_-12px_rgba(234,179,8,0.4)] transition-all duration-300"
                >
                  <Youtube size={20} />
                  {t('common:cta.connectOnYoutube')}
                </Button>
              </a>
              <Link to="/about">
                <Button
                  variant="secondary"
                  size="lg"
                  className="h-14 px-8 rounded-2xl border-greyscale-200 dark:border-greyscale-800 bg-white/50 dark:bg-greyscale-900/50 backdrop-blur-md hover:bg-white dark:hover:bg-greyscale-900 transition-all duration-300"
                >
                  {t('common:cta.exploreVision')} <ArrowRight size={20} />
                </Button>
              </Link>
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            className="group relative"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary-yellow-500/20 to-orange-500/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

            <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-greyscale-950 p-1 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary-yellow-500/50 to-transparent" />
              <div className="rounded-[2.25rem] border border-black/5 dark:border-white/5 bg-gradient-to-br from-black/[0.02] to-transparent dark:from-white/[0.05] p-8 lg:p-10 backdrop-blur-2xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/10 text-primary-yellow-500 ring-1 ring-primary-yellow-500/20">
                    <Quote size={24} />
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-1.5 w-1.5 rounded-full bg-greyscale-200 dark:bg-greyscale-800" />
                    ))}
                  </div>
                </div>
                <blockquote className="text-3xl font-black leading-[1.1] tracking-tight text-greyscale-950 dark:text-white sm:text-4xl italic">
                  {t('founderNote:hero.quote')}
                </blockquote>
                <p className="mt-8 text-base leading-relaxed text-greyscale-600 dark:text-greyscale-400 font-medium italic">
                  {t('founderNote:hero.quoteCaption')}
                </p>
                <div className="mt-10 flex items-center gap-4 border-t border-black/5 dark:border-white/10 pt-8">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-yellow-500 to-orange-500 p-[1px]">
                    <div className="h-full w-full rounded-full bg-greyscale-900 flex items-center justify-center overflow-hidden">
                      <span className="font-black text-primary-yellow-500 text-sm">OC</span>
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-xs font-black uppercase tracking-[0.2em] text-primary-yellow-500">
                      {t('founderNote:hero.founderName')}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-greyscale-500">{t('founderNote:hero.founderTitle')}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Dukkan Story Section */}
      <section className="relative w-full pb-20 lg:pb-32">
        <motion.div
          className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12"
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div className="max-w-2xl space-y-4">
              <Badge color="yellow" variant="outline" className="border-primary-yellow-500/20 text-primary-yellow-600 dark:text-primary-yellow-400">
                {t('founderNote:dukkan.badge')}
              </Badge>
              <h2 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
                {t('founderNote:dukkan.title')}
              </h2>
              <p className="text-lg text-greyscale-600 dark:text-greyscale-400 max-w-xl font-medium">
                {t('founderNote:dukkan.subtitle')}
              </p>
            </div>
          </div>

          <motion.div
            variants={fadeUp}
            className="mt-10 relative"
          >
             <div className="absolute -inset-1 bg-gradient-to-r from-primary-yellow-500/10 to-transparent blur-2xl -z-10" />
             <Card className="border-none bg-white/40 dark:bg-greyscale-900/40 backdrop-blur-xl p-8 sm:p-10 shadow-xl ring-1 ring-black/5 dark:ring-white/5">
                <p className="text-lg leading-relaxed text-greyscale-700 dark:text-greyscale-300 font-medium italic relative z-10">
                   <span className="absolute -left-4 -top-2 text-6xl text-primary-yellow-500/20 font-serif leading-none">"</span>
                   {t('founderNote:dukkan.note')}
                </p>
             </Card>
          </motion.div>
        </motion.div>

        <FounderDukkanVideo />
      </section>

      {/* Philosophy Points */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          className="grid gap-6 md:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {NOTE_ICONS.map((Icon, i) => {
            const title = t(`founderNote:philosophy.${i}.title`)
            const description = t(`founderNote:philosophy.${i}.description`)
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                whileHover={{ y: -8 }}
                className="h-full"
              >
                <Card className="h-full group relative overflow-hidden border-none bg-white/60 dark:bg-greyscale-900/60 backdrop-blur-md p-8 shadow-lg ring-1 ring-black/5 dark:ring-white/5 transition-all duration-500 hover:shadow-2xl hover:ring-primary-yellow-500/30">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-primary-yellow-500/5 blur-3xl group-hover:bg-primary-yellow-500/10 transition-colors" />

                  <div className="relative space-y-6">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-yellow-500/10 text-primary-yellow-600 dark:text-primary-yellow-400 ring-1 ring-primary-yellow-500/20 group-hover:bg-primary-yellow-500 group-hover:text-greyscale-950 transition-all duration-500">
                      <Icon size={28} />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-black text-greyscale-900 dark:text-greyscale-50 tracking-tight">{title}</h3>
                      <p className="text-base leading-relaxed text-greyscale-600 dark:text-greyscale-400 font-medium">{description}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Final Call to Action */}
      <section className="mx-auto max-w-5xl px-4 pb-24 text-center">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="space-y-8 py-20 rounded-[3rem] bg-gradient-to-b from-primary-yellow-500/5 to-transparent border border-primary-yellow-500/10"
        >
          <div className="flex flex-col items-center space-y-4">
             <Sparkles className="text-primary-yellow-500" size={32} />
             <h2 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
                {t('founderNote:cta.title')}
             </h2>
             <p className="text-lg text-greyscale-600 dark:text-greyscale-400 max-w-xl mx-auto font-medium">
                {t('founderNote:cta.subtitle')}
             </p>
          </div>
          <Link to="/battles" className="inline-block">
             <Button size="lg" className="h-16 px-10 rounded-2xl text-lg font-black shadow-xl shadow-primary-yellow-500/20">
                {t('common:cta.enterArena')}
                <ArrowRight size={20} />
             </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  )
}

export default FounderNotePage
