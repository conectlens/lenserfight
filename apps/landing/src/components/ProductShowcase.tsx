/**
 * ProductShowcase — marketing-grade section that showcases the four core
 * product surfaces with theme-aware CDN images, SEO semantics, and analytics.
 *
 * Used on both /home and /demo pages.
 * Caller controls heading hierarchy via `headingLevel` prop.
 */

import { Badge } from '@lenserfight/ui/components'
import { motion } from 'framer-motion'
import React from 'react'
import { useTranslation } from 'react-i18next'

import {
  MarketingMediaCard,
  type MarketingImageSource,
  type MarketingCTA,
} from './MarketingShowcase'

// ── Screenshot catalogue ──────────────────────────────────────────────────────
// Self-hosted, real screenshots captured from a running local instance —
// versioned with the app, no external CDN dependency.

const SHOTS = '/screenshots'

const LENS_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/lens-detail-light.png`,
  dark: `${SHOTS}/lens-detail-dark.png`,
  fallbackLabel: 'Lens Detail Preview Unavailable',
}

const WORKFLOW_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/workflow-detail-light.png`,
  dark: `${SHOTS}/workflow-detail-dark.png`,
  fallbackLabel: 'Workflow Detail Preview Unavailable',
}

const AGENT_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/agent-workspace-light.png`,
  dark: `${SHOTS}/agent-workspace-dark.png`,
  fallbackLabel: 'Agent Workspace Preview Unavailable',
}

const BATTLE_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/battle-detail-light.png`,
  dark: `${SHOTS}/battle-detail-dark.png`,
  fallbackLabel: 'Battle Detail Preview Unavailable',
}

const LENSERBOARD_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/lenserboard-light.png`,
  dark: `${SHOTS}/lenserboard-dark.png`,
  fallbackLabel: 'Lenserboard Preview Unavailable',
}

const LENSER_IMAGES: MarketingImageSource = {
  light: `${SHOTS}/lenser-profile-light.png`,
  dark: `${SHOTS}/lenser-profile-dark.png`,
  fallbackLabel: 'Lenser Profile Preview Unavailable',
}

// ── Animation ─────────────────────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 280, damping: 22 } as const
const viewport = { once: true, margin: '-60px' } as const

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
}

const cardReveal = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: spring },
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface ProductShowcaseProps {
  /** Controls which i18n namespace the copy lives in */
  readonly i18nNamespace: 'home' | 'demo'
  /** Base href for app links */
  readonly appBaseUrl: string
  /**
   * Section heading level — h2 is correct when this section is inside a page
   * that already has an h1.
   */
  readonly sectionHeadingLevel?: 'h2' | 'h3'
  /**
   * Battles are still experimental/planned — show that card only where it's
   * appropriate to talk about Battles (e.g. /demo), not on the home page.
   */
  readonly showBattleCard?: boolean
  readonly className?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ProductShowcase: React.FC<ProductShowcaseProps> = ({
  i18nNamespace,
  appBaseUrl,
  sectionHeadingLevel: SectionHeading = 'h2',
  showBattleCard = true,
  className,
}) => {
  const { t } = useTranslation(i18nNamespace)
  const ns = `${i18nNamespace}:productShowcase`

  const lensCtA: MarketingCTA = {
    label: t(`${ns}.lens.cta`),
    href: `${appBaseUrl}/lenses`,
    ariaLabel: t(`${ns}.lens.ctaAria`),
  }
  const workflowCta: MarketingCTA = {
    label: t(`${ns}.workflow.cta`),
    href: `${appBaseUrl}/workflows`,
    ariaLabel: t(`${ns}.workflow.ctaAria`),
  }
  const agentCta: MarketingCTA = {
    label: t(`${ns}.agent.cta`),
    href: `${appBaseUrl}/lensers?type=ai`,
    ariaLabel: t(`${ns}.agent.ctaAria`),
  }
  const lenserCta: MarketingCTA = {
    label: t(`${ns}.lenser.cta`),
    href: `${appBaseUrl}/lensers`,
    ariaLabel: t(`${ns}.lenser.ctaAria`),
  }
  const battleCta: MarketingCTA = {
    label: t(`${ns}.battle.cta`),
    href: `${appBaseUrl}/battles`,
    ariaLabel: t(`${ns}.battle.ctaAria`),
  }
  const lenserboardCta: MarketingCTA = {
    label: t(`${ns}.lenserboard.cta`),
    href: `${appBaseUrl}/lenserboard`,
    ariaLabel: t(`${ns}.lenserboard.ctaAria`),
  }

  return (
    <section
      aria-labelledby="product-showcase-heading"
      className={['mx-auto max-w-6xl px-4 sm:px-6 lg:px-8', className].filter(Boolean).join(' ')}
    >
      {/* Section header */}
      <motion.div
        className="mb-14 space-y-3"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        <motion.div variants={fadeUp}>
          <Badge color="yellow" variant="outline">
            {t(`${ns}.badge`)}
          </Badge>
        </motion.div>
        <motion.div variants={fadeUp}>
          <SectionHeading
            id="product-showcase-heading"
            className="text-3xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-4xl"
          >
            {t(`${ns}.title`)}
          </SectionHeading>
        </motion.div>
        <motion.p
          variants={fadeUp}
          className="max-w-2xl text-sm leading-7 text-greyscale-600 dark:text-greyscale-400"
        >
          {t(`${ns}.subtitle`)}
        </motion.p>
      </motion.div>

      {/* Cards */}
      <motion.div
        className="space-y-20 lg:space-y-28"
        variants={stagger}
        initial="hidden"
        whileInView="visible"
        viewport={viewport}
      >
        {/* 1 — Lens Detail */}
        <motion.div variants={cardReveal}>
          <MarketingMediaCard
            id="lens-detail"
            headingLevel="h3"
            tag={t(`${ns}.lens.tag`)}
            title={t(`${ns}.lens.title`)}
            description={t(`${ns}.lens.description`)}
            image={LENS_IMAGES}
            cta={lensCtA}
            aspectRatio="product"
            priority
            imagePosition="right"
          />
        </motion.div>

        {/* 2 — Workflow Detail */}
        <motion.div variants={cardReveal}>
          <MarketingMediaCard
            id="workflow-detail"
            headingLevel="h3"
            tag={t(`${ns}.workflow.tag`)}
            title={t(`${ns}.workflow.title`)}
            description={t(`${ns}.workflow.description`)}
            image={WORKFLOW_IMAGES}
            cta={workflowCta}
            aspectRatio="product"
            imagePosition="left"
          />
        </motion.div>

        {/* 3 — Agent Detail */}
        <motion.div variants={cardReveal}>
          <MarketingMediaCard
            id="agent-detail"
            headingLevel="h3"
            tag={t(`${ns}.agent.tag`)}
            title={t(`${ns}.agent.title`)}
            description={t(`${ns}.agent.description`)}
            image={AGENT_IMAGES}
            cta={agentCta}
            aspectRatio="product"
            imagePosition="right"
          />
        </motion.div>

        {/* 4 — Lenser Profile */}
        <motion.div variants={cardReveal}>
          <MarketingMediaCard
            id="lenser-profile"
            headingLevel="h3"
            tag={t(`${ns}.lenser.tag`)}
            title={t(`${ns}.lenser.title`)}
            description={t(`${ns}.lenser.description`)}
            image={LENSER_IMAGES}
            cta={lenserCta}
            aspectRatio="product"
            imagePosition="right"
          />
        </motion.div>

        {/* 5 — Battle Detail — Battles are experimental/planned; only show
             this card where it's appropriate to talk about Battles. */}
        {showBattleCard && (
          <motion.div variants={cardReveal}>
            <MarketingMediaCard
              id="battle-detail"
              headingLevel="h3"
              tag={t(`${ns}.battle.tag`)}
              title={t(`${ns}.battle.title`)}
              description={t(`${ns}.battle.description`)}
              image={BATTLE_IMAGES}
              cta={battleCta}
              aspectRatio="product"
              imagePosition="right"
            />
          </motion.div>
        )}

        {/* 6 — Lenserboard */}
        <motion.div variants={cardReveal}>
          <MarketingMediaCard
            id="lenserboard"
            headingLevel="h3"
            tag={t(`${ns}.lenserboard.tag`)}
            title={t(`${ns}.lenserboard.title`)}
            description={t(`${ns}.lenserboard.description`)}
            image={LENSERBOARD_IMAGES}
            cta={lenserboardCta}
            aspectRatio="landscape"
            imagePosition="right"
          />
        </motion.div>
      </motion.div>
    </section>
  )
}

export default ProductShowcase
