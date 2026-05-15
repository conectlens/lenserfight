import { Badge, Card, DesktopFrame, PageHeader } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import { ArrowRight, Clock, Shield, Zap } from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'

import { HeroFightPreview } from '../components/HeroFightPreview'

const ARENA_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

const HANDICAP_ICONS = [Clock, Clock, Shield, Zap] as const

export function BattleShowcasePage() {
  const { t } = useTranslation(['battleShowcase', 'common'])
  return (
    <div className="relative overflow-hidden bg-surface-base">
      <div className="absolute inset-x-0 top-0 -z-10 h-[20rem] bg-[radial-gradient(circle_at_top,_rgba(40,123,255,0.10),_transparent_45%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(circle_at_top,_rgba(40,123,255,0.07),_transparent_45%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Header */}
        <motion.div
          className="mb-10 space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0, 0, 0.2, 1] }}
        >
          <Badge color="yellow" variant="outline">{t('battleShowcase:hero.badge')}</Badge>
          <PageHeader
            title={
              <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl">
                {t('battleShowcase:hero.title')}
              </h1>
            }
            description={t('battleShowcase:hero.description')}
            className="mt-2"
          />
        </motion.div>

        {/* Live demo frame */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0, 0, 0.2, 1] }}
        >
          <DesktopFrame
            title={t('battleShowcase:preview.showcaseDemoTitle')}
            url={t('battleShowcase:preview.showcaseDemoUrl')}
            label={t('battleShowcase:hero.demoLabel')}
          >
            <HeroFightPreview />
          </DesktopFrame>
        </motion.div>

        {/* Handicap audit section */}
        <motion.div
          className="mb-12 space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2, ease: [0, 0, 0.2, 1] }}
        >
          <div className="space-y-2">
            <Badge color="yellow" variant="outline">{t('battleShowcase:handicap.badge')}</Badge>
            <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
              {t('battleShowcase:handicap.title')}
            </h2>
            <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
              {t('battleShowcase:handicap.description')}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {HANDICAP_ICONS.map((Icon, i) => {
              const label = t(`battleShowcase:handicap.items.${i}.label`)
              const value = t(`battleShowcase:handicap.items.${i}.value`)
              const description = t(`battleShowcase:handicap.items.${i}.description`)
              return (
                <Card key={i} className="flex gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-greyscale-500">
                    <Icon size={18} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-greyscale-500">{label}</p>
                      <p className="text-sm font-bold text-greyscale-900 dark:text-greyscale-0">{value}</p>
                    </div>
                    <p className="text-xs leading-5 text-greyscale-500 dark:text-greyscale-400">{description}</p>
                  </div>
                </Card>
              )
            })}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          className="rounded-3xl border border-surface-border bg-surface-raised p-8 text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3, ease: [0, 0, 0.2, 1] }}
        >
          <p className="text-xl font-bold text-greyscale-900 dark:text-greyscale-0">
            {t('battleShowcase:cta.title')}
          </p>
          <p className="mt-2 text-sm text-greyscale-500">
            {t('battleShowcase:cta.description')}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href={`${ARENA_APP_URL}/battles/create`}
              className="inline-flex items-center gap-2 rounded-full bg-greyscale-900 px-5 py-3 text-sm font-bold text-greyscale-0 transition-colors hover:opacity-90 dark:bg-surface-interactive dark:text-greyscale-0"
            >
              {t('common:cta.createBattle')} <ArrowRight size={15} />
            </a>
            <a
              href={`${ARENA_APP_URL}/battles`}
              className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-base px-5 py-3 text-sm font-semibold text-greyscale-700 transition-colors hover:border-primary-yellow-500 hover:text-greyscale-900 dark:text-greyscale-300 dark:hover:text-greyscale-0"
            >
              {t('common:cta.browseBattles')}
            </a>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
