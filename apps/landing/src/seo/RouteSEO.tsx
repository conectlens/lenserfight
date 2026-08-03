import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DEFAULT_LOCALE,
  ENABLED_LOCALES,
  getLocale,
  stripLocale,
} from '@lenserfight/utils/locale'
import { useLocale } from '@lenserfight/shared/i18n-routing'

const LANDING_HOST = 'https://lenserfight.com'
const OG_IMAGE = `${LANDING_HOST}/og-banner.png`

type SchemaType =
  | 'WebPage'
  | 'SoftwareApplication'
  | 'CollectionPage'
  | 'FAQPage'
  | 'AboutPage'

interface RouteMeta {
  key: string
  schemaType: SchemaType
}

const routeMeta: Record<string, RouteMeta> = {
  '/': { key: 'home', schemaType: 'SoftwareApplication' },
  '/about': { key: 'about', schemaType: 'AboutPage' },
  '/note': { key: 'founder_note', schemaType: 'AboutPage' },
  '/product': { key: 'product', schemaType: 'SoftwareApplication' },
  '/product/cli': { key: 'product_cli', schemaType: 'SoftwareApplication' },
  '/product/cli/quickstart': { key: 'product_cli_quickstart', schemaType: 'WebPage' },
  '/product/mobile': { key: 'product_mobile', schemaType: 'SoftwareApplication' },
  '/faq': { key: 'faq', schemaType: 'FAQPage' },
  '/roadmap': { key: 'roadmap', schemaType: 'WebPage' },
  '/get-started': { key: 'get_started', schemaType: 'WebPage' },

  '/battle-showcase': { key: 'battle_showcase', schemaType: 'CollectionPage' },
  '/policies/terms': { key: 'policy_terms', schemaType: 'WebPage' },
  '/policies/privacy': { key: 'policy_privacy', schemaType: 'WebPage' },
  '/policies/cookies': { key: 'policy_cookies', schemaType: 'WebPage' },
  '/policies/acceptable-use': { key: 'policy_acceptable_use', schemaType: 'WebPage' },
}

function normalizeUnprefixed(pathname: string): string {
  const stripped = stripLocale(pathname)
  const clean = stripped.replace(/\/+$/, '') || '/'
  if (clean === '/policies') return '/policies/terms'
  return clean
}

function urlFor(locale: string, unprefixed: string): string {
  const tail = unprefixed === '/' ? '' : unprefixed
  if (locale === DEFAULT_LOCALE) {
    return `${LANDING_HOST}${tail}`
  }
  return `${LANDING_HOST}/${locale}${tail}`
}

interface FaqEntryShape {
  title: string
  body: string
}
interface FaqGroupShape {
  entries: Record<string, FaqEntryShape>
}
interface FaqBundleShape {
  groups: Record<string, FaqGroupShape>
}

function buildFaqMainEntity(bundle: FaqBundleShape | undefined) {
  if (!bundle?.groups) return []
  return Object.values(bundle.groups).flatMap((group) =>
    Object.values(group.entries ?? {}).map((entry) => ({
      '@type': 'Question',
      name: entry.title,
      acceptedAnswer: {
        '@type': 'Answer',
        text: entry.body,
      },
    })),
  )
}

export function RouteSEO() {
  const location = useLocation()
  const { locale } = useLocale()
  const { t, i18n } = useTranslation('seo')

  const unprefixed = normalizeUnprefixed(location.pathname)
  const meta = routeMeta[unprefixed] ?? routeMeta['/']

  const title = t(`${meta.key}.title`)
  const description = t(`${meta.key}.description`)
  const canonicalUrl = urlFor(locale, unprefixed)
  const direction = getLocale(locale).direction

  const ogLocale = locale.replace('-', '_')

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': meta.schemaType,
    name: title,
    headline: title,
    description,
    url: canonicalUrl,
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: 'LenserFight',
      url: 'https://lenserfight.com',
      logo: 'https://cdn.lenserfight.com/brand/lenserfight-logo.png',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'LenserFight Arena',
      url: LANDING_HOST,
    },
  }

  // Real FAQPage structured data (Question/Answer mainEntity) so search
  // engines and AI answer engines can surface individual Q&As directly,
  // instead of a generic WebPage-shaped schema with no actual content.
  if (meta.schemaType === 'FAQPage') {
    const faqBundle = i18n.getResourceBundle(locale, 'faq') as FaqBundleShape | undefined
    const mainEntity = buildFaqMainEntity(faqBundle)
    if (mainEntity.length > 0) {
      jsonLd.mainEntity = mainEntity
    }
  }

  return (
    <Helmet>
      <html lang={locale} dir={direction} />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta
        property="og:type"
        content={meta.schemaType === 'CollectionPage' ? 'website' : 'article'}
      />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LenserFight Arena" />
      <meta property="og:locale" content={ogLocale} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@lenserfight" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      {ENABLED_LOCALES.map((code) => (
        <link
          key={code}
          rel="alternate"
          hrefLang={code}
          href={urlFor(code, unprefixed)}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={urlFor(DEFAULT_LOCALE, unprefixed)}
      />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}
