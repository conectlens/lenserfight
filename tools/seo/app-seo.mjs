import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_DATE = '2026-05-12'

// Locale registry — mirrors libs/utils/locale ENABLED_LOCALES. Keep in sync;
// the util-locale parity spec catches DB drift, and `loadArenaSeoStrings`
// below will throw if a translation file is missing.
const ARENA_ENABLED_LOCALES = ['en', 'tr']
const ARENA_DEFAULT_LOCALE = 'en'

// Path → seo.<key> mapping (mirrors apps/arena/src/seo/RouteSEO.tsx routeMeta).
const ARENA_SEO_KEY_BY_PATH = {
  '/': 'home',
  '/about': 'about',
  '/note-from-omer': 'founder_note',
  '/product': 'product',
  '/product/cli': 'product_cli',
  '/product/cli/quickstart': 'product_cli_quickstart',
  '/product/mobile': 'product_mobile',
  '/faq': 'faq',
  '/get-started': 'get_started',
  '/demo': 'demo',
  '/battle-showcase': 'battle_showcase',
  '/policies/terms': 'policy_terms',
  '/policies/privacy': 'policy_privacy',
  '/policies/cookies': 'policy_cookies',
  '/policies/acceptable-use': 'policy_acceptable_use',
}

const __seoDir = dirname(fileURLToPath(import.meta.url))
const __arenaLocalesDir = resolve(__seoDir, '../../apps/arena/src/locales')

const arenaSeoCache = new Map()
function loadArenaSeoStrings(locale) {
  if (arenaSeoCache.has(locale)) return arenaSeoCache.get(locale)
  const filePath = resolve(__arenaLocalesDir, `${locale}.json`)
  const raw = readFileSync(filePath, 'utf-8')
  const parsed = JSON.parse(raw)
  const seo = parsed?.seo ?? {}
  arenaSeoCache.set(locale, seo)
  return seo
}

const ORGANIZATION = {
  '@type': 'Organization',
  name: 'LenserFight',
  url: 'https://lenserfight.com',
  logo: 'https://lenserfight.com/favicons/original/apple-icon.png',
}

const absoluteUrl = (baseUrl, path) => {
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  const normalizedPath = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`
  return `${normalizedBase}${normalizedPath}`
}

const words = (value) =>
  String(value ?? '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const titleCase = (value) =>
  words(value)
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const truncate = (value, limit = 158) => {
  const text = words(value)
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1).trimEnd()}…`
}

const slugLabel = (slug, fallback) => titleCase(slug || fallback)

const createWebPageSchema = ({ title, description, canonicalUrl, appName, schemaType = 'WebPage' }) => ({
  '@context': 'https://schema.org',
  '@type': schemaType,
  name: title,
  headline: title,
  description,
  url: canonicalUrl,
  isPartOf: {
    '@type': 'WebSite',
    name: appName,
    url: canonicalUrl.startsWith('https://arena.') ? 'https://arena.lenserfight.com' : 'https://lenserfight.com',
  },
  publisher: ORGANIZATION,
})

const collectionSchema = (itemListName, itemListElement) => ({
  '@type': 'ItemList',
  name: itemListName,
  itemListElement: itemListElement.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    url: item.url,
  })),
})

const webStaticRoutes = [
  {
    path: '/',
    title: 'LenserFight Community | AI Lenses, Workflows, Battles, and Lensers',
    description:
      'Discover public AI lens templates, workflow patterns, battle results, rays, and Lenser profiles in the open LenserFight community.',
    priority: '1.0',
    changefreq: 'daily',
    schemaType: 'WebSite',
    heading: 'LenserFight Community',
    sections: [
      'Public AI lens templates for repeatable prompt and workflow automation',
      'Community Lensers, AI agents, rays, battles, and workflow galleries',
      'GitHub-shareable discovery pages built for search engines and AI crawlers',
    ],
    links: [
      { name: 'Browse AI lenses', path: '/lenses' },
      { name: 'Explore Lensers', path: '/lensers' },
      { name: 'Watch AI battles', path: '/battles' },
      { name: 'Open docs', url: 'https://docs.lenserfight.com/en/' },
    ],
  },
  {
    path: '/lenses',
    title: 'AI Lens Templates | Prompt Workflows and Automation Patterns',
    description:
      'Browse public LenserFight lenses for coding, research, startup planning, content generation, AI automation, and reusable prompt workflows.',
    priority: '0.95',
    changefreq: 'hourly',
    schemaType: 'CollectionPage',
    heading: 'AI Lens Templates',
    sections: [
      'Reusable public lenses for GPT, Claude, Gemini, local models, and multimodal AI work',
      'Template pages expose authors, tags, output intent, usage context, and remix paths',
      'Built for developers, creators, startups, and communities sharing AI workflows',
    ],
    links: [
      { name: 'Workflow templates', path: '/workflows/templates' },
      { name: 'Ray cloud', path: '/ray' },
      { name: 'Template authoring guide', url: 'https://docs.lenserfight.com/en/how-to/contributors/template-authoring' },
    ],
  },
  {
    path: '/marketplace',
    title: 'LenserFight Marketplace | Discover Public AI Workflow Assets',
    description:
      'Find public AI lenses, workflow assets, battle-ready templates, and reusable automation patterns from the LenserFight community.',
    priority: '0.82',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'LenserFight Marketplace',
    sections: [
      'A public discovery surface for AI workflow assets and battle-ready templates',
      'Designed for template reuse, GitHub sharing, and crawler-friendly collection pages',
    ],
    links: [
      { name: 'AI lenses', path: '/lenses' },
      { name: 'Battle templates', path: '/battles/templates' },
      { name: 'Workflow templates', path: '/workflows/templates' },
    ],
  },
  {
    path: '/lensers',
    title: 'Public Lensers | AI Creators, Agents, and Workflow Builders',
    description:
      'Explore public Lenser profiles, AI agents, creators, battle participants, and workflow builders shaping the LenserFight ecosystem.',
    priority: '0.9',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'Public Lensers',
    sections: [
      'Human and AI Lenser profiles with public lenses, battles, threads, and workflow activity',
      'Profile pages are structured for discoverability, social previews, and AI crawler summaries',
    ],
    links: [
      { name: 'Lenserboard', path: '/lenserboard' },
      { name: 'AI agents', path: '/agents' },
      { name: 'Creator profiles docs', url: 'https://docs.lenserfight.com/en/explanation/community/creator-profiles' },
    ],
  },
  {
    path: '/lenserboard',
    title: 'Lenserboard | Public AI Battle and Workflow Rankings',
    description:
      'Track high-signal Lensers, AI creators, battle contributors, workflow builders, and public community rankings on LenserFight.',
    priority: '0.76',
    changefreq: 'hourly',
    schemaType: 'CollectionPage',
    heading: 'Lenserboard',
    sections: [
      'Community rankings for public Lensers, battle contributors, AI agents, and workflow builders',
      'A crawlable scoreboard for discovering proven AI templates and creator expertise',
    ],
    links: [
      { name: 'Public Lensers', path: '/lensers' },
      { name: 'Battles', path: '/battles' },
      { name: 'Leaderboard docs', url: 'https://docs.lenserfight.com/en/reference/cli/leaderboard' },
    ],
  },
  {
    path: '/ray',
    title: 'Ray Cloud | AI Topics, Tags, and Workflow Discovery',
    description:
      'Browse LenserFight rays for AI coding, research, content generation, startup planning, agents, battles, and workflow automation topics.',
    priority: '0.86',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'Ray Cloud',
    sections: [
      'Topic-first discovery for lenses, Lensers, battles, threads, and AI workflow examples',
      'Canonical ray pages help crawlers understand how community content clusters together',
    ],
    links: [
      { name: 'AI lenses', path: '/lenses' },
      { name: 'Public threads', path: '/threads' },
      { name: 'Ray cloud docs', url: 'https://docs.lenserfight.com/en/explanation/community/ray-cloud' },
    ],
  },
  {
    path: '/battles',
    title: 'AI Battles | Public Model, Prompt, and Workflow Competitions',
    description:
      'Watch public LenserFight battles where humans, AI agents, prompts, and workflows compete with votes, judging, results, and replay pages.',
    priority: '0.94',
    changefreq: 'hourly',
    schemaType: 'CollectionPage',
    heading: 'AI Battles',
    sections: [
      'Public battle feeds expose challenge prompts, contenders, judging context, results, and replays',
      'Battle pages are optimized for social sharing, GitHub links, and AI comparison discovery',
    ],
    links: [
      { name: 'Battle discovery', path: '/battles/browse' },
      { name: 'Battle templates', path: '/battles/templates' },
      { name: 'Battle docs', url: 'https://docs.lenserfight.com/en/how-to/battles/create-a-battle' },
    ],
  },
  {
    path: '/battles/browse',
    title: 'Browse AI Battles | Compare Prompts, Agents, Models, and Workflows',
    description:
      'Discover public AI battles, compare model outputs, inspect judging context, and find battle-ready prompt workflows on LenserFight.',
    priority: '0.9',
    changefreq: 'hourly',
    schemaType: 'CollectionPage',
    heading: 'Browse AI Battles',
    sections: [
      'A crawlable battle discovery surface for model comparisons, prompt contests, and workflow evaluations',
      'Useful for developers researching AI comparison, evaluation, and battle systems',
    ],
    links: [
      { name: 'Live battle feed', path: '/battles' },
      { name: 'Arena view', path: '/battles/arena' },
      { name: 'Battle integrity checklist', url: 'https://docs.lenserfight.com/en/how-to/battles/battle-integrity-checklist' },
    ],
  },
  {
    path: '/battles/arena',
    title: 'Battle Arena | Live AI Comparison and Community Judging',
    description:
      'Enter the public LenserFight arena to follow AI battles, compare contenders, inspect judging signals, and discover winning workflows.',
    priority: '0.88',
    changefreq: 'hourly',
    schemaType: 'CollectionPage',
    heading: 'Battle Arena',
    sections: [
      'Live and recent AI battle cards designed for fast scanning and crawlable comparison context',
      'Connects public battle pages, result pages, templates, and Lenser profiles',
    ],
    links: [
      { name: 'Browse battles', path: '/battles/browse' },
      { name: 'Battle templates', path: '/battles/templates' },
      { name: 'Vote and judge docs', url: 'https://docs.lenserfight.com/en/how-to/battles/vote-and-judge' },
    ],
  },
  {
    path: '/battles/templates',
    title: 'Battle Templates | Reusable AI Evaluation and Prompt Contest Formats',
    description:
      'Find reusable battle templates for AI comparison, prompt tournaments, model evaluation, startup workflows, and creative generation contests.',
    priority: '0.88',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'Battle Templates',
    sections: [
      'Reusable challenge formats for prompt engineering, AI workflow testing, and community judging',
      'Each public template can become a shareable battle, replay, result page, and benchmark artifact',
    ],
    links: [
      { name: 'Create battle', path: '/battles/create' },
      { name: 'Battle schema reference', url: 'https://docs.lenserfight.com/en/reference/battles/schema' },
      { name: 'Template guide', url: 'https://docs.lenserfight.com/en/how-to/contributors/workflow-template-guide' },
    ],
  },
  {
    path: '/workflows',
    title: 'AI Workflows | Lens Chains, Agents, Automation, and Runs',
    description:
      'Build and discover LenserFight workflows that connect AI lenses, agents, providers, approvals, and execution runs for repeatable automation.',
    priority: '0.82',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'AI Workflows',
    sections: [
      'Workflow pages connect lens templates, agent execution, media outputs, approvals, and battle-ready artifacts',
      'Useful for AI productivity, automation, startup operations, and developer workflow sharing',
    ],
    links: [
      { name: 'Workflow templates', path: '/workflows/templates' },
      { name: 'Build a lens chain', url: 'https://docs.lenserfight.com/en/how-to/workflows/build-a-lens-chain' },
    ],
  },
  {
    path: '/workflows/templates',
    title: 'Workflow Templates | Public AI Automation Recipes',
    description:
      'Discover reusable AI workflow templates for coding, research, content generation, agent teams, approvals, and multimodal automation.',
    priority: '0.84',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'Workflow Templates',
    sections: [
      'Public workflow recipes for connecting lenses, models, providers, and automation triggers',
      'Template metadata is structured for search discovery and AI crawler summarization',
    ],
    links: [
      { name: 'AI workflows', path: '/workflows' },
      { name: 'Workflow template getting started', url: 'https://docs.lenserfight.com/en/how-to/contributors/workflow-template-getting-started' },
    ],
  },
  {
    path: '/ai/catalog',
    title: 'AI Model Catalog | Providers, Capabilities, and Workflow Routing',
    description:
      'Compare AI providers, models, modalities, JSON schema support, auth modes, and routing metadata for LenserFight lenses and workflows.',
    priority: '0.78',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'AI Model Catalog',
    sections: [
      'Provider and model metadata for choosing the right AI capability in a lens, battle, or workflow',
      'Supports OpenAI, Anthropic, Google, Mistral, local Ollama, media providers, and more',
    ],
    links: [
      { name: 'Model list', path: '/ai/catalog/models' },
      { name: 'AI providers reference', url: 'https://docs.lenserfight.com/en/reference/ai-providers' },
    ],
  },
  {
    path: '/ai/catalog/models',
    title: 'AI Models | Search Public Model Capabilities for Lenses and Battles',
    description:
      'Search LenserFight model metadata for text, image, audio, video, schema, reasoning, and automation capabilities across providers.',
    priority: '0.76',
    changefreq: 'daily',
    schemaType: 'CollectionPage',
    heading: 'AI Models',
    sections: [
      'A public capability index for matching models to lens templates, workflow steps, and battle evaluations',
      'Crawler-friendly metadata for provider discovery and AI ecosystem comparisons',
    ],
    links: [
      { name: 'Provider catalog', path: '/ai/catalog' },
      { name: 'AI models reference', url: 'https://docs.lenserfight.com/en/reference/ai-models' },
    ],
  },
]

const arenaStaticRoutes = [
  {
    path: '/',
    title: 'LenserFight Arena | AI Battles, Prompt Tournaments, and Model Comparisons',
    description:
      'LenserFight Arena is the public home for AI battles, prompt tournaments, model comparisons, community judging, and battle-ready workflows.',
    priority: '1.0',
    changefreq: 'daily',
    schemaType: 'SoftwareApplication',
    heading: 'LenserFight Arena',
    sections: [
      'Create structured battles where humans, AI agents, models, and workflows compete',
      'Compare outputs, collect votes, inspect judge rubrics, and publish shareable results',
      'Designed for GitHub communities, AI builders, startups, educators, and prompt workflow teams',
    ],
    links: [
      { name: 'Product overview', path: '/product' },
      { name: 'Battle showcase', path: '/battle-showcase' },
      { name: 'Get started', path: '/get-started' },
      { name: 'Docs', url: 'https://docs.lenserfight.com/en/' },
    ],
  },
  {
    path: '/product',
    title: 'AI Battle Platform | Compare Agents, Prompts, Models, and Workflows',
    description:
      'Explore LenserFight product capabilities for AI battle creation, prompt evaluation, model comparison, judging, replay, and workflow publishing.',
    priority: '0.92',
    changefreq: 'weekly',
    schemaType: 'SoftwareApplication',
    heading: 'AI Battle Platform',
    sections: [
      'Battle formats for prompts, code, images, agents, local models, and BYOK cloud execution',
      'Result pages give every public battle a shareable, crawler-readable evidence trail',
    ],
    links: [
      { name: 'CLI product', path: '/product/cli' },
      { name: 'Mobile app', path: '/product/mobile' },
      { name: 'Battle docs', url: 'https://docs.lenserfight.com/en/reference/battles/index' },
    ],
  },
  {
    path: '/product/cli',
    title: 'LenserFight CLI | Local AI Battles, Automation, and Developer Workflows',
    description:
      'Use the LenserFight CLI to run local AI battles, publish lenses, manage Lensers, inspect workflows, and automate AI evaluation from GitHub-friendly tooling.',
    priority: '0.82',
    changefreq: 'weekly',
    schemaType: 'SoftwareApplication',
    heading: 'LenserFight CLI',
    sections: [
      'Developer-first commands for local battles, providers, lenses, workflows, reports, and moderation',
      'Built for reproducible AI experiments and open-source contribution workflows',
    ],
    links: [
      { name: 'CLI reference', url: 'https://docs.lenserfight.com/en/reference/cli/index' },
      { name: 'CLI getting started', url: 'https://docs.lenserfight.com/en/tutorials/getting-started/cli-getting-started' },
    ],
  },
  {
    path: '/product/mobile',
    title: 'LenserFight Mobile | AI Battle Companion App',
    description:
      'Follow AI battles, review public results, track Lensers, and participate in the LenserFight community from the upcoming mobile companion app.',
    priority: '0.62',
    changefreq: 'weekly',
    schemaType: 'SoftwareApplication',
    heading: 'LenserFight Mobile',
    sections: [
      'A companion surface for battle notifications, profile discovery, voting, and community updates',
      'Designed to keep public battle results and AI creator activity easy to follow',
    ],
    links: [
      { name: 'Community hub', url: 'https://docs.lenserfight.com/en/explanation/community/community-hub' },
      { name: 'Get started', path: '/get-started' },
    ],
  },
  {
    path: '/battle-showcase',
    title: 'AI Battle Showcase | Prompt, Agent, and Model Evaluation Examples',
    description:
      'Preview public LenserFight battle formats for prompt tournaments, AI model comparisons, code challenges, media generation, and workflow evaluation.',
    priority: '0.9',
    changefreq: 'weekly',
    schemaType: 'CollectionPage',
    heading: 'AI Battle Showcase',
    sections: [
      'Examples of how battle prompts, contenders, voting, rubrics, and result pages fit together',
      'A public entry point for AI comparison, battle results, and evaluation template discovery',
    ],
    links: [
      { name: 'Create a battle', url: 'https://docs.lenserfight.com/en/how-to/battles/create-a-battle' },
      { name: 'Battle schema', url: 'https://docs.lenserfight.com/en/reference/battles/schema' },
    ],
  },
  {
    path: '/get-started',
    title: 'Get Started with LenserFight | Create Lenses, Battles, and AI Workflows',
    description:
      'Start using LenserFight to create AI lens templates, run battles, compare models, publish workflows, and join the public AI builder community.',
    priority: '0.88',
    changefreq: 'weekly',
    schemaType: 'WebPage',
    heading: 'Get Started with LenserFight',
    sections: [
      'Choose a path for creating a lens, running a battle, contributing on GitHub, or exploring docs',
      'Designed for both no-code community builders and developer-first local workflows',
    ],
    links: [
      { name: 'Getting started docs', url: 'https://docs.lenserfight.com/en/getting-started' },
      { name: 'Developer setup', url: 'https://docs.lenserfight.com/en/how-to/contributors/development-setup' },
    ],
  },
  {
    path: '/demo',
    title: 'LenserFight Demo | See AI Battles and Workflow Evaluation in Action',
    description:
      'Try the LenserFight demo flow for AI battle creation, prompt comparison, voting, judging, result sharing, and workflow discovery.',
    priority: '0.8',
    changefreq: 'weekly',
    schemaType: 'WebPage',
    heading: 'LenserFight Demo',
    sections: [
      'A guided public preview of battles, model comparison, voting, and workflow result pages',
      'Useful for teams evaluating AI productivity, prompt workflows, and community battle systems',
    ],
    links: [
      { name: 'Battle showcase', path: '/battle-showcase' },
      { name: 'Get started', path: '/get-started' },
    ],
  },
  {
    path: '/about',
    title: 'About LenserFight | Open AI Battle and Lens Workflow Community',
    description:
      'Learn how LenserFight connects public lenses, Lensers, AI agents, battles, workflows, docs, and open-source contribution paths.',
    priority: '0.74',
    changefreq: 'monthly',
    schemaType: 'AboutPage',
    heading: 'About LenserFight',
    sections: [
      'An open ecosystem for AI prompt workflows, reusable lenses, agent teams, battle results, and community governance',
      'Built for public discovery, GitHub contribution, AI experimentation, and transparent evaluation',
    ],
    links: [
      { name: 'Community model', url: 'https://docs.lenserfight.com/en/explanation/community/open-core-model' },
      { name: 'GitHub', url: 'https://github.com/conectlens/lenserfight' },
    ],
  },
  {
    path: '/note-from-omer',
    title: 'Note from Omer | The Founder Story Behind LenserFight',
    description:
      'Read Omer Faruk Coskun’s founder note on the dream, story, and first spark behind LenserFight, the public arena for AI and human evaluation.',
    priority: '0.76',
    changefreq: 'monthly',
    schemaType: 'AboutPage',
    heading: 'Note from Omer',
    sections: [
      'A personal founder note about the dream, vision, and first spark behind LenserFight',
      'Features the Dukkan visual chapter and the YouTube story that helped start the journey',
    ],
    links: [
      { name: 'Omer on YouTube', url: 'https://www.youtube.com/@ofcskn' },
      { name: 'About LenserFight', path: '/about' },
    ],
  },
  {
    path: '/faq',
    title: 'LenserFight FAQ | AI Battles, Lenses, Agents, and Workflows',
    description:
      'Answers about LenserFight battles, AI lenses, Lensers, workflow automation, judging, public profiles, GitHub contribution, and local execution.',
    priority: '0.78',
    changefreq: 'monthly',
    schemaType: 'FAQPage',
    heading: 'LenserFight FAQ',
    sections: [
      'Practical answers for builders evaluating AI battle systems, workflow templates, and public Lenser profiles',
      'Connects product concepts to docs, GitHub contribution, local development, and public discovery',
    ],
    links: [
      { name: 'Docs', url: 'https://docs.lenserfight.com/en/' },
      { name: 'Support docs', url: 'https://docs.lenserfight.com/en/how-to/contributors/support' },
    ],
  },
  {
    path: '/policies/terms',
    title: 'LenserFight Terms | Public AI Battle and Community Platform Rules',
    description:
      'Read the LenserFight terms for public AI battles, community participation, workflow publishing, accounts, acceptable use, and platform access.',
    priority: '0.42',
    changefreq: 'monthly',
    schemaType: 'WebPage',
    heading: 'Terms of Service',
    sections: ['Platform rules for LenserFight accounts, public community activity, AI battles, and workflow publishing.'],
    links: [
      { name: 'Privacy policy', path: '/policies/privacy' },
      { name: 'Acceptable use', path: '/policies/acceptable-use' },
    ],
  },
  {
    path: '/policies/privacy',
    title: 'LenserFight Privacy Policy | Community, Battle, and Workflow Data',
    description:
      'Review how LenserFight handles account, community, battle, workflow, analytics, and public profile data.',
    priority: '0.42',
    changefreq: 'monthly',
    schemaType: 'WebPage',
    heading: 'Privacy Policy',
    sections: ['Privacy details for LenserFight users, contributors, Lensers, public battles, workflow execution, and community features.'],
    links: [
      { name: 'Terms', path: '/policies/terms' },
      { name: 'Cookie policy', path: '/policies/cookies' },
    ],
  },
  {
    path: '/policies/cookies',
    title: 'LenserFight Cookie Policy | Site Analytics and Product Preferences',
    description:
      'Learn how LenserFight uses cookies and similar technologies for documentation, product analytics, account preferences, and platform reliability.',
    priority: '0.36',
    changefreq: 'monthly',
    schemaType: 'WebPage',
    heading: 'Cookie Policy',
    sections: ['Cookie and preference handling for LenserFight public sites, docs, community pages, and product surfaces.'],
    links: [
      { name: 'Privacy policy', path: '/policies/privacy' },
      { name: 'Terms', path: '/policies/terms' },
    ],
  },
  {
    path: '/policies/acceptable-use',
    title: 'LenserFight Acceptable Use | AI Battle and Community Safety Rules',
    description:
      'Understand acceptable use for LenserFight public battles, AI agents, workflow templates, generated media, community content, and API access.',
    priority: '0.38',
    changefreq: 'monthly',
    schemaType: 'WebPage',
    heading: 'Acceptable Use',
    sections: ['Safety rules for public AI battles, agents, workflow automation, generated content, and community participation.'],
    links: [
      { name: 'Terms', path: '/policies/terms' },
      { name: 'Security docs', url: 'https://docs.lenserfight.com/en/how-to/contributors/security' },
    ],
  },
]

const dynamicRoutePatterns = {
  web: [
    {
      pattern: '/lenses/:id',
      title: ({ id }) => `${slugLabel(id, 'Lens')} | Public AI Lens Template`,
      description: ({ id }) =>
        `Public LenserFight lens template ${slugLabel(id, 'lens')} with reusable instructions, tags, author context, workflow intent, and remix paths.`,
      schemaType: 'CreativeWork',
    },
    {
      pattern: '/lenser/:handle',
      title: ({ handle }) => `${slugLabel(handle, 'Lenser')} | Public Lenser Profile`,
      description: ({ handle }) =>
        `Public Lenser profile for ${slugLabel(handle, 'creator')}, including AI lenses, workflows, battle activity, agents, and community contributions.`,
      schemaType: 'ProfilePage',
    },
    {
      pattern: '/ray/:slug',
      title: ({ slug }) => `${slugLabel(slug, 'Ray')} AI Workflows, Lenses, and Battles`,
      description: ({ slug }) =>
        `Discover public LenserFight content for ${slugLabel(slug, 'this ray')}: lenses, Lensers, battle templates, workflows, and community discussions.`,
      schemaType: 'CollectionPage',
    },
    {
      pattern: '/battles/:slug',
      title: ({ slug }) => `${slugLabel(slug, 'AI Battle')} | LenserFight Battle`,
      description: ({ slug }) =>
        `Public LenserFight battle ${slugLabel(slug, 'battle')} with challenge context, contenders, AI judging, community votes, and result discovery.`,
      schemaType: 'CreativeWork',
    },
    {
      pattern: '/battles/:slug/result',
      title: ({ slug }) => `${slugLabel(slug, 'AI Battle')} Results | LenserFight`,
      description: ({ slug }) =>
        `Public results for the ${slugLabel(slug, 'AI battle')} battle, including winners, judging context, community votes, and comparison signals.`,
      schemaType: 'CreativeWork',
    },
    {
      pattern: '/threads/:threadId',
      title: ({ threadId }) => `${slugLabel(threadId, 'Community Thread')} | LenserFight Discussion`,
      description: ({ threadId }) =>
        `Public LenserFight discussion ${slugLabel(threadId, 'thread')} about AI lenses, workflows, battles, model behavior, and community practice.`,
      schemaType: 'DiscussionForumPosting',
    },
  ],
  arena: [
    {
      pattern: '/battles/:slug',
      title: ({ slug }) => `${slugLabel(slug, 'AI Battle')} | LenserFight Arena`,
      description: ({ slug }) =>
        `Public arena page for ${slugLabel(slug, 'AI battle')}, with prompt context, contenders, community judging, replay, and result links.`,
      schemaType: 'CreativeWork',
    },
    {
      pattern: '/battles/:slug/results',
      title: ({ slug }) => `${slugLabel(slug, 'AI Battle')} Results | LenserFight Arena`,
      description: ({ slug }) =>
        `Shareable AI battle results for ${slugLabel(slug, 'this battle')}, including judging context, votes, comparison signals, and public replay paths.`,
      schemaType: 'CreativeWork',
    },
  ],
}

const apps = {
  web: {
    name: 'LenserFight Community',
    baseUrl: 'https://lenserfight.com',
    ogImage: 'https://lenserfight.com/og-banner.png',
    routes: webStaticRoutes,
    disallow: [
      '/admin/',
      '/auth/',
      '/account/',
      '/billing',
      '/chat',
      '/notifications',
      '/onboarding',
      '/settings/',
      '/s/',
      '/agents/*/workspace',
      '/battles/create',
      '/battles/new',
      '/battles/templates/new',
      '/battles/templates/*/edit',
      '/threads/compose',
      '/workflows/*/run/',
    ],
  },
  arena: {
    name: 'LenserFight Arena',
    baseUrl: 'https://arena.lenserfight.com',
    ogImage: 'https://arena.lenserfight.com/og-banner.png',
    routes: arenaStaticRoutes,
    disallow: ['/auth/', '/contact'],
    locales: ARENA_ENABLED_LOCALES,
    defaultLocale: ARENA_DEFAULT_LOCALE,
  },
}

function localePath(locale, unprefixed) {
  if (unprefixed === '/' || unprefixed === '') return `/${locale}`
  return `/${locale}${unprefixed}`
}

function localizeRoute(app, route, locale) {
  const seoKey = ARENA_SEO_KEY_BY_PATH[route.path]
  const strings = seoKey ? loadArenaSeoStrings(locale)?.[seoKey] : null
  const title = strings?.title ?? route.title
  const description = strings?.description ?? route.description
  const localizedPath = localePath(locale, route.path)
  return { ...route, path: localizedPath, title, description, locale }
}

function buildHreflangAlternates(app, unprefixed) {
  if (!app.locales) return []
  return [
    ...app.locales.map((code) => ({
      hrefLang: code,
      href: absoluteUrl(app.baseUrl, localePath(code, unprefixed)),
    })),
    {
      hrefLang: 'x-default',
      href: absoluteUrl(app.baseUrl, localePath(app.defaultLocale, unprefixed)),
    },
  ]
}

function withResolvedLinks(app, route) {
  const canonicalUrl = absoluteUrl(app.baseUrl, route.path)
  // For localized arena routes, internal link paths in the route definition
  // are still unprefixed (e.g., '/product') — prefix them with the active
  // locale so emitted SEO HTML points to the localized variants.
  const linkLocale = route.locale ?? null
  const resolveLinkPath = (link) => {
    if (link.url) return link.url
    if (linkLocale && link.path) return absoluteUrl(app.baseUrl, localePath(linkLocale, link.path))
    return absoluteUrl(app.baseUrl, link.path)
  }
  const links = (route.links ?? []).map((link) => ({
    ...link,
    url: resolveLinkPath(link),
  }))
  const schema = {
    ...createWebPageSchema({
      title: route.title,
      description: route.description,
      canonicalUrl,
      appName: app.name,
      schemaType: route.schemaType,
    }),
    ...(links.length
      ? {
          hasPart: collectionSchema(
            `${route.heading ?? route.title} internal links`,
            links.map((link) => ({ name: link.name, url: link.url })),
          ),
        }
      : {}),
  }
  return {
    ...route,
    canonicalUrl,
    ogImage: route.ogImage ?? app.ogImage,
    links,
    jsonLd: route.jsonLd ?? schema,
  }
}

const expandRoutes = (app) => {
  if (!app.locales) {
    return app.routes.map((route) => withResolvedLinks(app, route))
  }
  const expanded = []
  for (const route of app.routes) {
    for (const locale of app.locales) {
      const localized = localizeRoute(app, route, locale)
      const resolved = withResolvedLinks(app, localized)
      expanded.push({
        ...resolved,
        unprefixedPath: route.path,
        alternates: buildHreflangAlternates(app, route.path),
      })
    }
  }
  return expanded
}

const getAppSeo = (appName) => {
  const app = apps[appName]
  if (!app) throw new Error(`Unknown SEO app "${appName}"`)
  return {
    ...app,
    routes: expandRoutes(app),
    dynamicRoutePatterns: dynamicRoutePatterns[appName] ?? [],
  }
}

// Un-localized base routes — for generate-app-seo.mjs's bare-path Tier-1 shim emission.
const getAppBaseRoutes = (appName) => {
  const app = apps[appName]
  if (!app) throw new Error(`Unknown SEO app "${appName}"`)
  return {
    ...app,
    routes: app.routes.map((route) => withResolvedLinks(app, route)),
  }
}

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const escapeAttr = escapeHtml

const renderHeadTags = (route, { noindex = false } = {}) => {
  const schema = JSON.stringify(route.jsonLd).replace(/</g, '\\u003c')
  const alternates = (route.alternates ?? [])
    .map(
      (alt) =>
        `<link rel="alternate" hreflang="${escapeAttr(alt.hrefLang)}" href="${escapeAttr(alt.href)}" />`,
    )
    .join('\n  ')
  const ogLocale = route.locale ? route.locale.replace('-', '_') : null
  return [
    `<title>${escapeHtml(route.title)}</title>`,
    `<meta name="description" content="${escapeAttr(truncate(route.description, 170))}" />`,
    `<link rel="canonical" href="${escapeAttr(route.canonicalUrl)}" />`,
    `<meta name="robots" content="${noindex ? 'noindex,nofollow' : 'index,follow,max-image-preview:large'}" />`,
    `<meta property="og:title" content="${escapeAttr(route.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(truncate(route.description, 200))}" />`,
    `<meta property="og:type" content="${route.schemaType === 'ProfilePage' ? 'profile' : route.schemaType === 'CollectionPage' ? 'website' : 'article'}" />`,
    `<meta property="og:url" content="${escapeAttr(route.canonicalUrl)}" />`,
    `<meta property="og:image" content="${escapeAttr(route.ogImage)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:site_name" content="LenserFight" />`,
    ogLocale ? `<meta property="og:locale" content="${escapeAttr(ogLocale)}" />` : null,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:site" content="@lenserfight" />`,
    `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(truncate(route.description, 200))}" />`,
    `<meta name="twitter:image" content="${escapeAttr(route.ogImage)}" />`,
    alternates || null,
    `<script type="application/ld+json">${schema}</script>`,
  ]
    .filter(Boolean)
    .join('\n  ')
}

const renderRedirectShim = ({ targetUrl, canonicalUrl }) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="refresh" content="0;url=${escapeAttr(targetUrl)}">
<link rel="canonical" href="${escapeAttr(canonicalUrl)}">
<meta name="robots" content="noindex,follow">
<title>Redirecting…</title>
</head>
<body>
<p>Redirecting to <a href="${escapeAttr(targetUrl)}">${escapeHtml(targetUrl)}</a>.</p>
</body>
</html>
`

const renderSeoMain = (route) => {
  const sections = (route.sections ?? []).map((text) => `<li>${escapeHtml(text)}</li>`).join('\n        ')
  const links = (route.links ?? [])
    .map((link) => `<li><a href="${escapeAttr(link.url)}">${escapeHtml(link.name)}</a></li>`)
    .join('\n        ')

  return `<main id="seo-prerender" aria-hidden="true" style="display:none" aria-label="${escapeAttr(route.heading ?? route.title)}">
      <article>
        <h1>${escapeHtml(route.heading ?? route.title)}</h1>
        <p>${escapeHtml(route.description)}</p>
        ${sections ? `<section aria-labelledby="seo-highlights"><h2 id="seo-highlights">Highlights</h2><ul>${sections}</ul></section>` : ''}
        ${links ? `<nav aria-label="Related LenserFight pages"><h2>Related pages</h2><ul>${links}</ul></nav>` : ''}
      </article>
    </main>`
}

const injectSeoIntoHtml = (html, route, options = {}) => {
  const withoutExistingSeo = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+name=["']description["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<link\s+rel=["']canonical["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<meta\s+(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+|robots)["'][^>]*>\s*/gi, '\n')
    .replace(/\s*<script\s+type=["']application\/ld\+json["'][\s\S]*?<\/script>\s*/gi, '\n')

  const withHead = withoutExistingSeo.replace('</head>', `  ${renderHeadTags(route, options)}\n</head>`)
  return withHead.replace('<div id="root"></div>', `<div id="root">\n    ${renderSeoMain(route)}\n  </div>`)
}

const routeOutputPath = (routePath) => {
  if (routePath === '/') return 'index.html'
  return `${routePath.replace(/^\/+|\/+$/g, '')}/index.html`
}

const renderSitemap = (appName) => {
  const app = getAppSeo(appName)
  const seen = new Set()
  const urls = app.routes.filter((route) => {
    if (seen.has(route.canonicalUrl)) return false
    seen.add(route.canonicalUrl)
    return true
  })

  const xmlns = app.locales
    ? 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml"'
    : 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"'

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset ${xmlns}>
${urls
  .map(
    (route) => `  <url>
    <loc>${route.canonicalUrl}</loc>${
      (route.alternates ?? [])
        .map(
          (alt) =>
            `\n    <xhtml:link rel="alternate" hreflang="${escapeAttr(alt.hrefLang)}" href="${escapeAttr(alt.href)}" />`,
        )
        .join('')
    }
    <lastmod>${DEFAULT_DATE}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`
}

const renderRobots = (appName) => {
  const app = getAppSeo(appName)
  const disallow = app.disallow.map((path) => `Disallow: ${path}`).join('\n')
  return `User-agent: *
Allow: /
${disallow}

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: DuckDuckBot
Allow: /

User-agent: YandexBot
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: facebookexternalhit
Allow: /

Sitemap: ${absoluteUrl(app.baseUrl, '/sitemap.xml')}
`
}

const matchDynamicRoute = (appName, pathname) => {
  const app = getAppSeo(appName)
  const cleanPath = pathname.split('?')[0].replace(/\/+$/, '') || '/'
  for (const route of app.routes) {
    if (route.path === cleanPath) return route
  }
  for (const pattern of app.dynamicRoutePatterns) {
    const keys = []
    const source = pattern.pattern
      .replace(/\/+$/, '')
      .replace(/:[^/]+/g, (match) => {
        keys.push(match.slice(1))
        return '([^/]+)'
      })
    const match = cleanPath.match(new RegExp(`^${source}$`))
    if (!match) continue
    const params = Object.fromEntries(keys.map((key, index) => [key, decodeURIComponent(match[index + 1] ?? '')]))
    const canonicalUrl = absoluteUrl(app.baseUrl, cleanPath)
    const title = pattern.title(params)
    const description = truncate(pattern.description(params), 170)
    return {
      path: cleanPath,
      title,
      description,
      heading: title,
      canonicalUrl,
      ogImage: app.ogImage,
      schemaType: pattern.schemaType,
      priority: '0.64',
      changefreq: 'daily',
      links: app.routes.slice(0, 4).map((route) => ({ name: route.heading ?? route.title, url: absoluteUrl(app.baseUrl, route.path) })),
      jsonLd: createWebPageSchema({
        title,
        description,
        canonicalUrl,
        appName: app.name,
        schemaType: pattern.schemaType,
      }),
    }
  }
  return null
}

export {
  absoluteUrl,
  getAppSeo,
  getAppBaseRoutes,
  injectSeoIntoHtml,
  matchDynamicRoute,
  renderHeadTags,
  renderRedirectShim,
  renderRobots,
  renderSeoMain,
  renderSitemap,
  routeOutputPath,
  truncate,
}
