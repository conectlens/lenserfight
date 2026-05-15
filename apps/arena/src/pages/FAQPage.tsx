import { Accordion, Badge, Button, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  Brain,
  Coins,
  ExternalLink,
  HelpCircle,
  ListChecks,
  Lock,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
  Workflow,
  Zap,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink as Link } from '@lenserfight/shared/i18n-routing'

import { chainabitContactUrl } from '../utils/chainabitUrls'

const RUN_APP_URL = import.meta.env.ARENA_URL ?? 'https://moon.lenserfight.com'

const spring = { type: 'spring', stiffness: 260, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

interface FaqEntry {
  id: string
  icon: React.ElementType
}

interface FaqGroup {
  id: string
  entries: FaqEntry[]
}

const FAQ_GROUPS: FaqGroup[] = [
  {
    id: 'product',
    entries: [
      { id: 'whatIs', icon: HelpCircle },
      { id: 'primitives', icon: ListChecks },
      { id: 'battleTypes', icon: Brain },
      { id: 'fairness', icon: ShieldCheck },
    ],
  },
  {
    id: 'voting',
    entries: [
      { id: 'whoVotes', icon: Users },
      { id: 'aiJudge', icon: Sparkles },
      { id: 'resultsPermanent', icon: ScrollText },
    ],
  },
  {
    id: 'agents',
    entries: [
      { id: 'aiAgents', icon: User },
      { id: 'agentTeams', icon: Users },
      { id: 'workflows', icon: Workflow },
    ],
  },
  {
    id: 'reputation',
    entries: [
      { id: 'xp', icon: Trophy },
    ],
  },
  {
    id: 'platform',
    entries: [
      { id: 'whoCanUse', icon: Lock },
      { id: 'pricing', icon: Coins },
      { id: 'openSource', icon: Activity },
    ],
  },
]

export const FAQPage: React.FC = () => {
  const { i18n, t } = useTranslation(['faq', 'common'])

  return (
    <div className="relative overflow-hidden bg-surface-base text-surface-text">
      <div className="absolute inset-x-0 top-0 -z-10 h-[24rem] bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.16),_transparent_55%),linear-gradient(180deg,rgba(248,249,250,0.95),transparent)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(255,222,89,0.10),_transparent_50%),linear-gradient(180deg,rgba(26,26,26,0.95),transparent)]" />

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 lg:pt-24 lg:pb-16">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          <Badge color="yellow" variant="outline">{t('faq:hero.badge')}</Badge>
          <h1 className="text-4xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-5xl lg:text-6xl">
            {t('faq:hero.title')}
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-greyscale-600 dark:text-greyscale-400">
            {t('faq:hero.subtitle')}
          </p>
        </motion.div>
      </section>

      {/* ── FAQ GROUPS ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
        <div className="space-y-8">
          {FAQ_GROUPS.map(({ id, entries }) => (
            <motion.div
              key={id}
              variants={fadeUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge color="yellow" variant="outline">{t(`faq:groups.${id}.label`)}</Badge>
              </div>
              <Accordion type="multiple">
                {entries.map(({ id: itemId, icon: Icon }) => (
                  <Accordion.Item
                    key={itemId}
                    title={t(`faq:groups.${id}.entries.${itemId}.title`)}
                    icon={<Icon size={16} />}
                  >
                    <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                      {t(`faq:groups.${id}.entries.${itemId}.body`)}
                    </p>
                  </Accordion.Item>
                ))}
              </Accordion>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── STILL HAVE QUESTIONS? ─────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8 lg:pb-32">
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={viewport}
          transition={spring}
        >
          <Card className="grid gap-6 p-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="space-y-3">
              <Badge color="yellow" variant="outline">{t('faq:stillCurious.badge')}</Badge>
              <h2 className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
                {t('faq:stillCurious.title')}
              </h2>
              <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
                {t('faq:stillCurious.description')}
              </p>
            </div>
            <div className="flex flex-col flex-wrap gap-3 sm:flex-row lg:flex-shrink-0 lg:flex-col">
              <a href={`${RUN_APP_URL}/battles?utm_source=lenserfight&utm_medium=arena_faq&utm_campaign=arena_faq_cta`}>
                <Button variant="primary" size="lg" fullWidth>
                  {t('common:cta.browseBattles')} <ArrowRight size={16} />
                </Button>
              </a>
              <Link to="/demo">
                <Button variant="secondary" size="lg" fullWidth>
                  {t('faq:stillCurious.seeDemo')} <Zap size={16} />
                </Button>
              </Link>
              <a
                href={chainabitContactUrl({ lang: i18n.language, utmMedium: 'arena_faq', utmCampaign: 'arena_faq_contact' })}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="ghost" size="lg" fullWidth>
                  {t('common:cta.contactUs')} <ExternalLink size={14} />
                </Button>
              </a>
            </div>
          </Card>
        </motion.div>
      </section>
    </div>
  )
}
