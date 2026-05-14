import { Helmet } from 'react-helmet-async'
import { useLocation } from 'react-router-dom'

const ARENA_HOST = 'https://arena.lenserfight.com'
const OG_IMAGE = `${ARENA_HOST}/og-banner.png`

type ArenaRouteMeta = {
  title: string
  description: string
  schemaType: 'WebPage' | 'SoftwareApplication' | 'CollectionPage' | 'FAQPage' | 'AboutPage'
}

const routeMeta: Record<string, ArenaRouteMeta> = {
  '/': {
    title: 'LenserFight Arena | AI Battles, Prompt Tournaments, and Model Comparisons',
    description:
      'LenserFight Arena is the public home for AI battles, prompt tournaments, model comparisons, community judging, and battle-ready workflows.',
    schemaType: 'SoftwareApplication',
  },
  '/about': {
    title: 'About LenserFight | Open AI Battle and Lens Workflow Community',
    description:
      'Learn how LenserFight connects public lenses, Lensers, AI agents, battles, workflows, docs, and open-source contribution paths.',
    schemaType: 'AboutPage',
  },
  '/note-from-omer': {
    title: 'Note from Omer | The Founder Story Behind LenserFight',
    description:
      'Read Omer Faruk Coskun’s founder note on the dream, story, and first spark behind LenserFight, the public arena for AI and human evaluation.',
    schemaType: 'AboutPage',
  },
  '/product': {
    title: 'AI Battle Platform | Compare Agents, Prompts, Models, and Workflows',
    description:
      'Explore LenserFight product capabilities for AI battle creation, prompt evaluation, model comparison, judging, replay, and workflow publishing.',
    schemaType: 'SoftwareApplication',
  },
  '/product/cli': {
    title: 'LenserFight CLI | Local AI Battles, Automation, and Developer Workflows',
    description:
      'Use the LenserFight CLI to run local AI battles, publish lenses, manage Lensers, inspect workflows, and automate AI evaluation from GitHub-friendly tooling.',
    schemaType: 'SoftwareApplication',
  },
  '/product/mobile': {
    title: 'LenserFight Mobile | AI Battle Companion App',
    description:
      'Follow AI battles, review public results, track Lensers, and participate in the LenserFight community from the upcoming mobile companion app.',
    schemaType: 'SoftwareApplication',
  },
  '/faq': {
    title: 'LenserFight FAQ | AI Battles, Lenses, Agents, and Workflows',
    description:
      'Answers about LenserFight battles, AI lenses, Lensers, workflow automation, judging, public profiles, GitHub contribution, and local execution.',
    schemaType: 'FAQPage',
  },
  '/get-started': {
    title: 'Get Started with LenserFight | Create Lenses, Battles, and AI Workflows',
    description:
      'Start using LenserFight to create AI lens templates, run battles, compare models, publish workflows, and join the public AI builder community.',
    schemaType: 'WebPage',
  },
  '/demo': {
    title: 'LenserFight Demo | See AI Battles and Workflow Evaluation in Action',
    description:
      'Try the LenserFight demo flow for AI battle creation, prompt comparison, voting, judging, result sharing, and workflow discovery.',
    schemaType: 'WebPage',
  },
  '/battle-showcase': {
    title: 'AI Battle Showcase | Prompt, Agent, and Model Evaluation Examples',
    description:
      'Preview public LenserFight battle formats for prompt tournaments, AI model comparisons, code challenges, media generation, and workflow evaluation.',
    schemaType: 'CollectionPage',
  },
  '/policies/terms': {
    title: 'LenserFight Terms | Public AI Battle and Community Platform Rules',
    description:
      'Read the LenserFight terms for public AI battles, community participation, workflow publishing, accounts, acceptable use, and platform access.',
    schemaType: 'WebPage',
  },
  '/policies/privacy': {
    title: 'LenserFight Privacy Policy | Community, Battle, and Workflow Data',
    description:
      'Review how LenserFight handles account, community, battle, workflow, analytics, and public profile data.',
    schemaType: 'WebPage',
  },
  '/policies/cookies': {
    title: 'LenserFight Cookie Policy | Site Analytics and Product Preferences',
    description:
      'Learn how LenserFight uses cookies and similar technologies for documentation, product analytics, account preferences, and platform reliability.',
    schemaType: 'WebPage',
  },
  '/policies/acceptable-use': {
    title: 'LenserFight Acceptable Use | AI Battle and Community Safety Rules',
    description:
      'Understand acceptable use for LenserFight public battles, AI agents, workflow templates, generated media, community content, and API access.',
    schemaType: 'WebPage',
  },
}

function normalizePath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, '') || '/'
  if (clean === '/policies') return '/policies/terms'
  return clean
}

export function RouteSEO() {
  const location = useLocation()
  const pathname = normalizePath(location.pathname)
  const meta = routeMeta[pathname] ?? routeMeta['/']
  const canonicalUrl = `${ARENA_HOST}${pathname === '/' ? '/' : pathname}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': meta.schemaType,
    name: meta.title,
    headline: meta.title,
    description: meta.description,
    url: canonicalUrl,
    publisher: {
      '@type': 'Organization',
      name: 'LenserFight',
      url: 'https://lenserfight.com',
      logo: 'https://cdn.lenserfight.com/brand/lenserfight-logo.png',
    },
    isPartOf: {
      '@type': 'WebSite',
      name: 'LenserFight Arena',
      url: ARENA_HOST,
    },
  }

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:type" content={meta.schemaType === 'CollectionPage' ? 'website' : 'article'} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="LenserFight Arena" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@lenserfight" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  )
}
