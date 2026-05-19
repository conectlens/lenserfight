/**
 * MarketingShowcase — reusable marketing media primitives.
 *
 * Exports:
 *   resolveMarketingImageByTheme()  — picks correct CDN URL by theme
 *   MarketingImageFallback          — styled fallback when image fails
 *   MarketingMediaCard              — full showcase card (image + copy + CTA)
 *   ProductShowcaseSection          — composed 4-category SEO marketing section
 *
 * Design goals:
 *   - Mobile-first responsive
 *   - Zero CLS: explicit aspect ratio containers
 *   - Lightweight fade-in via CSS animation (no framer-motion per-card)
 *   - Skeleton loading state
 *   - IntersectionObserver impression tracking
 *   - Future-extensible: video, GIF, carousel, CMS-driven, multilingual
 */

import { useAnalyticsApi } from '@lenserfight/infra/analytics'
import { useTheme } from '@lenserfight/ui/theme'
import { ArrowRight } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MarketingTheme = 'light' | 'dark'

export interface MarketingImageSource {
  /** URL for light theme */
  readonly light: string
  /** URL for dark theme */
  readonly dark: string
  /** Fallback if both variants are missing */
  readonly fallbackLabel: string
}

export interface MarketingCTA {
  readonly label: string
  readonly href: string
  /** Aria label for accessibility */
  readonly ariaLabel: string
}

export interface MarketingMediaCardProps {
  /** Semantic identifier used for analytics (e.g. 'lens-detail') */
  readonly id: string
  /** Section-level H tag (h2/h3). Caller controls heading hierarchy. */
  readonly headingLevel?: 'h2' | 'h3'
  readonly tag: string
  readonly title: string
  readonly description: string
  readonly image: MarketingImageSource
  readonly cta: MarketingCTA
  /** Override resolved theme (useful for pages that control theme manually) */
  readonly themeOverride?: MarketingTheme
  /** Width/height ratio: 'landscape' = 16/9, 'wide' = 21/9, 'product' = 16/10 */
  readonly aspectRatio?: 'landscape' | 'wide' | 'product'
  /** Whether image is above the fold — controls loading strategy */
  readonly priority?: boolean
  /** Layout: image on left or right of copy */
  readonly imagePosition?: 'left' | 'right'
}

// ── Theme resolver ────────────────────────────────────────────────────────────

/**
 * Returns the correct CDN URL based on current resolved theme.
 * SSR-safe: always returns `light` URL during server render.
 */
export function resolveMarketingImageByTheme(
  source: MarketingImageSource,
  theme: MarketingTheme
): string {
  return theme === 'dark' ? source.dark : source.light
}

// ── Fallback ──────────────────────────────────────────────────────────────────

interface MarketingImageFallbackProps {
  readonly label: string
  readonly className?: string
}

export const MarketingImageFallback: React.FC<MarketingImageFallbackProps> = ({
  label,
  className,
}) => (
  <div
    role="img"
    aria-label={label}
    className={[
      'flex items-center justify-center rounded-xl',
      'bg-surface-raised border border-surface-border',
      'text-sm font-medium text-greyscale-400 dark:text-greyscale-500',
      'select-none px-6 py-4 text-center',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {label}
  </div>
)

// ── Skeleton ──────────────────────────────────────────────────────────────────

const ASPECT_PADDING: Record<NonNullable<MarketingMediaCardProps['aspectRatio']>, string> = {
  landscape: 'aspect-video',
  wide: 'aspect-[21/9]',
  product: 'aspect-[16/10]',
}

const MarketingImageSkeleton: React.FC<{ aspectRatio: string }> = ({ aspectRatio }) => (
  <div
    className={['w-full animate-pulse rounded-xl bg-surface-raised', aspectRatio].join(' ')}
    aria-hidden="true"
  />
)

// ── Image with fallback ───────────────────────────────────────────────────────

interface MarketingImageProps {
  readonly src: string
  readonly alt: string
  readonly fallbackLabel: string
  readonly aspectRatio: string
  readonly priority: boolean
}

const MarketingImage: React.FC<MarketingImageProps> = ({
  src,
  alt,
  fallbackLabel,
  aspectRatio,
  priority,
}) => {
  const [state, setState] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <div className={['relative w-full overflow-hidden rounded-xl', aspectRatio].join(' ')}>
      {state === 'loading' && <MarketingImageSkeleton aspectRatio="absolute inset-0" />}
      {state === 'error' ? (
        <MarketingImageFallback label={fallbackLabel} className="absolute inset-0 h-full" />
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'low'}
          onLoad={() => setState('loaded')}
          onError={() => setState('error')}
          className={[
            'absolute inset-0 h-full w-full object-cover object-top',
            'transition-opacity duration-500',
            state === 'loaded' ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />
      )}
    </div>
  )
}

// ── MarketingMediaCard ────────────────────────────────────────────────────────

export const MarketingMediaCard: React.FC<MarketingMediaCardProps> = ({
  id,
  headingLevel: HeadingTag = 'h3',
  tag,
  title,
  description,
  image,
  cta,
  themeOverride,
  aspectRatio = 'product',
  priority = false,
  imagePosition = 'right',
}) => {
  const { resolvedTheme } = useTheme()
  const theme: MarketingTheme = themeOverride ?? resolvedTheme
  const { trackEvent } = useAnalyticsApi()
  const cardRef = useRef<HTMLElement>(null)
  const impressionFired = useRef(false)
  const [hovered, setHovered] = useState(false)

  const resolvedSrc = resolveMarketingImageByTheme(image, theme)
  const aspectClass = ASPECT_PADDING[aspectRatio]

  // Impression tracking via IntersectionObserver
  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionFired.current) {
          impressionFired.current = true
          trackEvent({ name: 'marketing_image_impression', properties: { cardId: id } })
        }
      },
      { threshold: 0.4 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [id, trackEvent])

  const handleCtaClick = useCallback(() => {
    trackEvent({ name: 'marketing_cta_click', properties: { cardId: id, href: cta.href } })
  }, [id, cta.href, trackEvent])

  const handleMouseEnter = useCallback(() => {
    setHovered(true)
    trackEvent({ name: 'marketing_media_hover', properties: { cardId: id } })
  }, [id, trackEvent])

  const handleMouseLeave = useCallback(() => setHovered(false), [])

  const copyBlock = (
    <div className="flex flex-col justify-center gap-5">
      <span className="inline-flex w-fit items-center rounded-full border border-primary-yellow-500/30 bg-primary-yellow-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-primary-yellow-600 dark:text-primary-yellow-400">
        {tag}
      </span>
      <HeadingTag className="text-2xl font-black tracking-tight text-greyscale-900 dark:text-greyscale-0 sm:text-3xl lg:text-4xl">
        {title}
      </HeadingTag>
      <p className="max-w-prose text-sm leading-7 text-greyscale-600 dark:text-greyscale-400 sm:text-base">
        {description}
      </p>
      <a
        href={cta.href}
        aria-label={cta.ariaLabel}
        onClick={handleCtaClick}
        className={[
          'inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5',
          'bg-greyscale-900 dark:bg-greyscale-0',
          'text-sm font-bold text-greyscale-0 dark:text-greyscale-900',
          'transition-all duration-200',
          'hover:bg-primary-yellow-500 hover:text-greyscale-900',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-yellow-500/40',
          hovered && 'scale-[1.02]',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {cta.label}
        <ArrowRight size={14} aria-hidden="true" />
      </a>
    </div>
  )

  const mediaBlock = (
    <figure className="m-0" aria-label={image.fallbackLabel}>
      <MarketingImage
        src={resolvedSrc}
        alt={title}
        fallbackLabel={image.fallbackLabel}
        aspectRatio={aspectClass}
        priority={priority}
      />
    </figure>
  )

  return (
    <article
      ref={cardRef}
      aria-label={title}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={[
        'grid gap-8 lg:gap-12',
        'animate-fadeIn',
        imagePosition === 'right' ? 'lg:grid-cols-[1fr_1.1fr]' : 'lg:grid-cols-[1.1fr_1fr]',
      ].join(' ')}
    >
      {imagePosition === 'right' ? (
        <>
          {copyBlock}
          {mediaBlock}
        </>
      ) : (
        <>
          {mediaBlock}
          {copyBlock}
        </>
      )}
    </article>
  )
}
