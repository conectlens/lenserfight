import { Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle,
  ExternalLink,
  FolderOpen,
  GitBranch,
  Github,
  Smartphone,
  Terminal,
  Zap,
} from 'lucide-react'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'

const GITHUB_URL = 'https://github.com/conectlens/lenserfight'
const MOBILE_APP_PATH = 'apps/mobile'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const STEPS = [
  { step: '01', icon: GitBranch, command: 'git clone https://github.com/conectlens/lenserfight.git' },
  { step: '02', icon: Terminal, command: 'pnpm install' },
  { step: '03', icon: Zap, command: 'pnpm nx serve mobile' },
  { step: '04', icon: FolderOpen, command: `cd ${MOBILE_APP_PATH}/src` },
] as const

const NEED_INDICES = [0, 1, 2, 3, 4, 5] as const

export const MobileComingSoonPage: React.FC = () => {
  const { t } = useTranslation(['mobile', 'common'])
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.16),_transparent_50%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.12),_transparent_48%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.div
          className="max-w-3xl space-y-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp} className="flex items-center gap-3">
            <Badge color="yellow" variant="outline">{t('common:badges.comingSoon')}</Badge>
            <Badge color="purple" variant="outline">{t('common:badges.openContributions')}</Badge>
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
              <Smartphone size={32} />
            </div>
            <div>
              <h1 className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl">
                {t('mobile:hero.title')}{' '}
                <span className="text-greyscale-400 dark:text-greyscale-500">{t('mobile:hero.titleFaded')}</span>
              </h1>
            </div>
          </motion.div>

          <motion.p
            variants={fadeUp}
            className="max-w-xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-400"
          >
            {t('mobile:hero.subtitle')}
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            <a
              href={`${GITHUB_URL}/tree/main/${MOBILE_APP_PATH}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="primary" size="lg">
                <Github size={16} />
                {t('mobile:cta.viewApps')}
                <ExternalLink size={14} />
              </Button>
            </a>
            <a
              href={`${GITHUB_URL}/issues?q=label%3Amobile`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" size="lg">
                {t('common:cta.goodFirstIssues')} <ArrowRight size={16} />
              </Button>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* CONTRIBUTE STEPS */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="green" variant="outline">{t('mobile:contribute.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('mobile:contribute.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {t('mobile:contribute.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="relative mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {STEPS.map(({ step, icon: Icon, command }, i) => {
            const title = t(`mobile:contribute.steps.${i}.title`)
            const description = t(`mobile:contribute.steps.${i}.description`)
            return (
              <motion.div key={step} variants={fadeUp}>
                <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-yellow-500 text-greyscale-900">
                      <Icon size={18} />
                    </div>
                    <span className="text-xs font-black tracking-widest text-greyscale-400">{step}</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h3>
                    <code className="block rounded-lg bg-surface-raised px-3 py-2 font-mono text-xs text-primary-yellow-700 dark:text-primary-yellow-400 break-all">
                      {command}
                    </code>
                  </div>
                  <p className="text-sm leading-6 text-greyscale-500 dark:text-greyscale-400">{description}</p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* WHAT WE NEED */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div
          className="grid gap-8 lg:grid-cols-2 lg:items-start"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={viewport}
          transition={{ ...spring, delay: 0.1 }}
        >
          <Card className="h-full space-y-5 p-8">
            <Badge color="purple" variant="outline">{t('mobile:needs.badge')}</Badge>
            <h2 className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
              {t('mobile:needs.title')}
            </h2>
            <ul className="space-y-2.5">
              {NEED_INDICES.map((i) => {
                const item = t(`mobile:needs.items.${i}`)
                return (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-greyscale-600 dark:text-greyscale-400">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
                    {item}
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="relative h-full space-y-5 overflow-hidden bg-greyscale-900 p-8">
            <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
            <div className="relative space-y-4">
              <Badge color="yellow" variant="solid">{t('mobile:cta.badge')}</Badge>
              <h2 className="text-2xl font-black text-greyscale-0">
                {t('mobile:cta.title')}
              </h2>
              <p className="text-sm leading-7 text-greyscale-400">
                <Trans
                  i18nKey="cta.description"
                  ns="mobile"
                  components={{ strong: <strong className="text-greyscale-200" /> }}
                />
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`${GITHUB_URL}/issues/new?labels=mobile`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="lg">
                    {t('common:cta.openIssue')} <ExternalLink size={14} />
                  </Button>
                </a>
                <a
                  href={`${GITHUB_URL}/issues?q=label%3Amobile+is%3Aopen`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="ghost" size="lg" className="text-greyscale-300 hover:text-greyscale-0">
                    {t('common:cta.browseIssues')} <ArrowRight size={14} />
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
