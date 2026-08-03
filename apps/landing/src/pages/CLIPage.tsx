import { Badge, Button, Card } from '@lenserfight/ui/components'
import { DOCS_BASE_URL } from '@lenserfight/utils/env'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  ExternalLink,
  Layers,
  Sword,
  Terminal,
  Zap,
} from 'lucide-react'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'
import React from 'react'
import { useTranslation } from 'react-i18next'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const fadeLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: { opacity: 1, x: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
}

const FEATURE_ICONS = [Sword, Layers, Zap] as const
const COMMAND_INDICES = [0, 1, 2, 3] as const
const REQUIREMENT_INDICES = [0, 1, 2] as const

export const CLIPage: React.FC = () => {
  const { t } = useTranslation(['cli', 'common'])
  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[28rem] bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.16),_transparent_50%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,0.12),_transparent_48%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-20 sm:px-6 lg:px-8 lg:pt-24 lg:pb-24">
        <motion.div
          className="grid gap-12 lg:grid-cols-2 lg:items-start"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <div className="space-y-6">
            <motion.div variants={fadeUp}>
              <Badge color="yellow" variant="outline">{t('cli:hero.badge')}</Badge>
            </motion.div>
            <motion.div variants={fadeUp} className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                <Terminal size={32} />
              </div>
              <h1 className="text-5xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-6xl">
                {t('cli:hero.title')}{' '}
                <span className="text-greyscale-400 dark:text-greyscale-300">{t('cli:hero.titleFaded')}</span>
              </h1>
            </motion.div>
            <motion.p
              variants={fadeUp}
              className="max-w-xl text-xl leading-9 text-greyscale-600 dark:text-greyscale-300"
            >
              {t('cli:hero.subtitle')}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
              <a
                href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_cli_page&utm_campaign=cli_docs`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="primary" size="lg">
                  <BookOpen size={16} />
                  {t('common:cta.readDocs')}
                  <ExternalLink size={14} />
                </Button>
              </a>
              <Link to="/product/cli/quickstart">
                <Button variant="secondary" size="lg">
                  {t('cli:hero.quickstart')} <ArrowRight size={16} />
                </Button>
              </Link>
            </motion.div>
          </div>

          {/* Terminal preview */}
          <motion.div variants={fadeUp}>
            <div className="overflow-hidden rounded-2xl border border-greyscale-800 bg-greyscale-950 shadow-2xl">
              <div className="flex items-center gap-2 border-b border-white/5 bg-white/5 px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-status-red/80 shadow-sm" />
                  <span className="h-3 w-3 rounded-full bg-primary-yellow-500/80 shadow-sm" />
                  <span className="h-3 w-3 rounded-full bg-status-green/80 shadow-sm" />
                </div>
                <span className="ml-2 text-xs font-mono font-medium text-greyscale-400">lenserfight — bash</span>
              </div>
              <div className="space-y-4 p-6 font-mono text-sm sm:p-8">
                {COMMAND_INDICES.map((i) => {
                  const cmd = t(`cli:commands.${i}.cmd`)
                  const desc = t(`cli:commands.${i}.desc`)
                  return (
                    <div key={i} className="group space-y-1.5">
                      <div className="flex items-start gap-3">
                        <span className="select-none font-bold text-primary-yellow-500">$</span>
                        <span className="text-greyscale-50 transition-colors group-hover:text-white">{cmd}</span>
                      </div>
                      <p className="pl-6 text-xs text-greyscale-500 italic"># {desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div variants={fadeLeft} initial="hidden" whileInView="visible" viewport={viewport}>
          <Badge color="yellow" variant="outline">{t('cli:features.badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {t('cli:features.title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-300">
            {t('cli:features.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="mt-8 grid gap-5 md:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          {FEATURE_ICONS.map((Icon, i) => {
            const title = t(`cli:features.items.${i}.title`)
            const description = t(`cli:features.items.${i}.description`)
            return (
              <motion.div key={i} variants={fadeUp}>
                <Card className="h-full space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-colors hover:border-t-primary-yellow-500">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-base font-bold text-greyscale-900 dark:text-greyscale-0">{title}</h3>
                  <p className="text-sm leading-7 text-greyscale-500 dark:text-greyscale-200">{description}</p>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* INSTALL */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          className="grid gap-5 md:grid-cols-2"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
        >
          <motion.div variants={fadeUp}>
            <Card className="h-full space-y-4 p-8">
              <Badge color="yellow" variant="outline">{t('cli:install.badge')}</Badge>
              <h2 className="text-2xl font-black text-greyscale-900 dark:text-greyscale-0">
                {t('cli:install.title')}
              </h2>
              <code className="block rounded-xl bg-surface-raised px-4 py-3 font-mono text-sm text-primary-yellow-700 dark:text-primary-yellow-400">
                {t('cli:install.command')}
              </code>
              <ul className="space-y-2">
                {REQUIREMENT_INDICES.map((i) => {
                  const item = t(`cli:install.requirements.${i}`)
                  return (
                    <li key={i} className="flex items-center gap-2 text-sm text-greyscale-600 dark:text-greyscale-300">
                      <CheckCircle size={13} className="shrink-0 text-primary-yellow-600 dark:text-primary-yellow-400" />
                      {item}
                    </li>
                  )
                })}
              </ul>
            </Card>
          </motion.div>

          <motion.div variants={fadeUp}>
            <div className="relative h-full space-y-4 overflow-hidden rounded-2xl bg-greyscale-900 p-8 shadow-sm">
              <div className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,222,89,1),_transparent_60%)]" />
              <div className="relative space-y-4">
                <Badge color="yellow" variant="solid">{t('cli:reference.badge')}</Badge>
                <h2 className="text-2xl font-black text-white">
                  {t('cli:reference.title')}
                </h2>
                <p className="text-sm leading-7 text-greyscale-400">
                  {t('cli:reference.description')}
                </p>
                <a
                  href={`${DOCS_BASE_URL}/tutorials/getting-started/overview?utm_source=lenserfight&utm_medium=arena_cli_page&utm_campaign=cli_full_docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="primary" size="lg">
                    {t('common:cta.openDocs')} <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>
    </div>
  )
}
