import { Badge, Card } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import {
  Aperture,
  ArrowRight,
  Brain,
  ExternalLink,
  FlaskConical,
  MessageSquare,
  Swords,
  Terminal,
  User,
  Workflow,
  type LucideIcon,
} from 'lucide-react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { LocaleLink } from '@lenserfight/shared/i18n-routing'

const RUN_APP_URL = import.meta.env.WEB_BASE_URL ?? 'https://moon.lenserfight.com'

export type PillarColor = 'yellow' | 'green' | 'purple' | 'blue' | 'red' | 'gray'

export interface PlatformPillar {
  readonly key: string
  readonly icon: LucideIcon
  readonly href: string
  readonly external: boolean
  readonly color: PillarColor
}

/**
 * Canonical list of LenserFight platform pillars.
 * Order is deliberate: Battles first (flagship), CLI last (developer surface).
 */
export const DEFAULT_PLATFORM_PILLARS: ReadonlyArray<PlatformPillar> = [
  { key: 'battles', icon: Swords, href: `${RUN_APP_URL}/battles`, external: true, color: 'yellow' },
  { key: 'agents', icon: Brain, href: `${RUN_APP_URL}/agents`, external: true, color: 'purple' },
  { key: 'workflows', icon: Workflow, href: `${RUN_APP_URL}/workflows`, external: true, color: 'blue' },
  { key: 'lenses', icon: Aperture, href: `${RUN_APP_URL}/lenses`, external: true, color: 'green' },
  { key: 'prompts', icon: MessageSquare, href: `${RUN_APP_URL}/prompts`, external: true, color: 'yellow' },
  { key: 'workspaces', icon: FlaskConical, href: `${RUN_APP_URL}/workspaces`, external: true, color: 'purple' },
  { key: 'lensers', icon: User, href: `${RUN_APP_URL}/lensers`, external: true, color: 'green' },
  { key: 'cli', icon: Terminal, href: '/product/cli', external: false, color: 'red' },
] as const

export interface PlatformPillarsProps {
  readonly pillars?: ReadonlyArray<PlatformPillar>
  readonly i18nNamespace?: string
  readonly i18nPrefix?: string
  readonly variant?: 'detailed' | 'compact'
  readonly utm?: { source?: string; medium?: string; campaign?: string }
  readonly className?: string
  readonly showHeader?: boolean
}

function appendUtm(href: string, utm: PlatformPillarsProps['utm'], pillarKey: string): string {
  if (!utm) return href
  if (!/^https?:\/\//i.test(href)) return href
  try {
    const url = new URL(href)
    if (utm.source) url.searchParams.set('utm_source', utm.source)
    if (utm.medium) url.searchParams.set('utm_medium', utm.medium)
    url.searchParams.set('utm_campaign', utm.campaign ?? pillarKey)
    return url.toString()
  } catch {
    return href
  }
}

/**
 * Reusable grid surfacing every platform pillar (battles, agents, workflows,
 * lenses, prompts, workspaces, lensers, CLI). i18n-driven so the same
 * component can render on /demo, /product, or any other arena page.
 */
export const PlatformPillars: React.FC<PlatformPillarsProps> = ({
  pillars = DEFAULT_PLATFORM_PILLARS,
  i18nNamespace = 'demo',
  i18nPrefix = 'pillars',
  variant = 'detailed',
  utm,
  className,
  showHeader = true,
}) => {
  const { t } = useTranslation([i18nNamespace, 'common'])
  const tk = (suffix: string) => t(`${i18nPrefix}.${suffix}`)

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.06 } },
  }
  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 22 } },
  } as const

  const gridClass =
    variant === 'compact'
      ? 'mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4'
      : 'mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

  return (
    <section className={className}>
      {showHeader && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ type: 'spring', stiffness: 280, damping: 22 }}
        >
          <Badge color="yellow" variant="outline">{tk('badge')}</Badge>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0">
            {tk('title')}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {tk('subtitle')}
          </p>
        </motion.div>
      )}

      <motion.div
        className={gridClass}
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-60px' }}
      >
        {pillars.map((pillar) => (
          <motion.div key={pillar.key} variants={itemVariants}>
            <PlatformPillarCard
              pillar={pillar}
              variant={variant}
              ctaLabel={t('common:cta.learnMore', { defaultValue: 'Learn more' })}
              name={t(`${i18nPrefix}.items.${pillar.key}.name`, { defaultValue: pillar.key })}
              title={t(`${i18nPrefix}.items.${pillar.key}.title`)}
              description={t(`${i18nPrefix}.items.${pillar.key}.description`)}
              href={appendUtm(pillar.href, utm, pillar.key)}
            />
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}

interface PlatformPillarCardProps {
  readonly pillar: PlatformPillar
  readonly variant: 'detailed' | 'compact'
  readonly name: string
  readonly title: string
  readonly description: string
  readonly href: string
  readonly ctaLabel: string
}

const PlatformPillarCard: React.FC<PlatformPillarCardProps> = ({
  pillar,
  variant,
  name,
  title,
  description,
  href,
  ctaLabel,
}) => {
  const Icon = pillar.icon

  const inner = (
    <Card
      className={[
        'group flex h-full flex-col space-y-4 border-t-4 border-t-primary-yellow-500/40 p-6 transition-all',
        'hover:-translate-y-0.5 hover:border-t-primary-yellow-500 hover:shadow-md',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-yellow-500/15 text-primary-yellow-700 dark:text-primary-yellow-400">
          <Icon size={20} aria-hidden="true" />
        </div>
        <Badge color={pillar.color} variant="outline" size="sm">
          {name}
        </Badge>
      </div>

      <div className="space-y-2">
        <h3 className="flex items-center gap-1.5 text-base font-bold text-greyscale-900 dark:text-greyscale-50">
          {title}
          {pillar.external && (
            <ExternalLink
              size={12}
              className="text-greyscale-400 transition-colors group-hover:text-greyscale-700 dark:group-hover:text-greyscale-200"
              aria-hidden="true"
            />
          )}
        </h3>
        {variant === 'detailed' && (
          <p className="text-sm leading-7 text-greyscale-600 dark:text-greyscale-400">
            {description}
          </p>
        )}
      </div>

      {variant === 'detailed' && (
        <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-semibold text-greyscale-700 transition-colors group-hover:text-primary-yellow-700 dark:text-greyscale-300 dark:group-hover:text-primary-yellow-400">
          {ctaLabel} <ArrowRight size={12} aria-hidden="true" />
        </span>
      )}
    </Card>
  )

  if (pillar.external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
      >
        {inner}
      </a>
    )
  }

  return (
    <LocaleLink
      to={href}
      className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-yellow-500"
    >
      {inner}
    </LocaleLink>
  )
}

export default PlatformPillars
