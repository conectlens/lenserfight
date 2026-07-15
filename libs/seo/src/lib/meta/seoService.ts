import { Lenser, LenserStats } from '@lenserfight/types'
import { LensDetailViewModel, LensViewModel } from '@lenserfight/types'
import { TagUsage } from '@lenserfight/types'
import { ThreadDetailViewModel, ThreadFeedItem } from '@lenserfight/types'

export interface SEOMetadata {
  title: string
  description: string
  /** Canonical URL for this page (absolute). */
  url?: string
  /** Absolute URL to the OG image for this page. */
  ogImage?: string
  /** Serialized JSON-LD structured data object (not stringified — passed to SEOHead). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsonLd?: Record<string, any>
  /** Whether crawlers should index this page. Defaults to true in SEOHead. */
  index?: boolean
}

const SITE_NAME = 'LenserFight'
/** Host that actually serves community + battle entities (apps/web). */
const FORUM_HOST = 'https://moon.lenserfight.com'
/** Apex marketing site (different app) — reserved for genuine cross-links only, not entity canonicals. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ARENA_HOST = 'https://lenserfight.com'
const DOCS_HOST = 'https://docs.lenserfight.com'
const DEFAULT_OG_IMAGE = `${FORUM_HOST}/og-banner.png`
const ARENA_OG_IMAGE = `${FORUM_HOST}/og-banner.png`
const DEFAULT_TITLE = 'LenserFight Community | AI Lenses, Workflows, Battles, and Lensers'
const DEFAULT_DESC =
  'Discover public AI Prompt & Lens Templates, workflow patterns, battle results, rays, and Lenser profiles in the open LenserFight community.'

const AI_KEYWORDS = [
  'AI workflows',
  'AI agents',
  'prompt engineering',
  'model comparison',
  'workflow automation',
  'developer AI tools',
  'GitHub workflows',
]

const ORGANIZATION_JSON_LD = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: FORUM_HOST,
  logo: `${FORUM_HOST}/favicons/original/apple-icon.png`,
  sameAs: ['https://github.com/conectlens/lenserfight', DOCS_HOST],
}

function clampDescription(value: string, max = 158): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  return `${clean.slice(0, max - 1).trimEnd()}…`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function compactKeywords(values: Array<string | undefined | null>): string {
  return Array.from(new Set(values.filter(Boolean).map((value) => value!.trim()).filter(Boolean))).join(', ')
}

/** Build a BreadcrumbList from an ordered Home › … › entity trail. */
function breadcrumbJsonLd(items: Array<{ name: string; url: string }>) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

function collectionPageJsonLd(name: string, description: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    publisher: ORGANIZATION_JSON_LD,
    isPartOf: {
      '@type': 'WebSite',
      name: SITE_NAME,
      url: FORUM_HOST,
    },
  }
}

export const seoService = {
  getHomeMeta: (): SEOMetadata => ({
    title: DEFAULT_TITLE,
    description: DEFAULT_DESC,
    url: FORUM_HOST,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: FORUM_HOST,
      description: DEFAULT_DESC,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${FORUM_HOST}/lenses?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    },
  }),

  getPromptMeta: (
    prompt?: LensDetailViewModel | LensViewModel | null
  ): SEOMetadata => {
    if (!prompt)
      return {
        title: 'Lens Not Found',
        description: 'This lens could not be found on LenserFight.',
        url: `${FORUM_HOST}/lenses`,
        ogImage: DEFAULT_OG_IMAGE,
      }

    const tags = prompt.tags?.map((t) => t.name).join(', ') || 'AI workflows'
    const author = prompt.author.displayName
    const uses = prompt.usageCount > 0 ? `Used ${prompt.usageCount} times.` : ''
    const pageUrl = `${FORUM_HOST}/lenses/${prompt.id}`
    const primaryTag = prompt.tags?.[0]

    const desc = clampDescription(
      prompt.description ||
      `Use the "${prompt.title}" AI lens template by ${author}. Built for ${tags}. ${uses} Copy, remix, and connect this lens into LenserFight workflows, battles, and agent runs.`,
    )

    // LikeAction stars live on LensDetailViewModel.reactionCounts (sum of reactions);
    // LensViewModel feed items don't carry them — guard so we omit gracefully.
    const reactionCounts = (prompt as LensDetailViewModel).reactionCounts
    const likeCount = reactionCounts
      ? Object.values(reactionCounts).reduce((sum, n) => sum + (n ?? 0), 0)
      : undefined
    const interactionStatistic = [
      prompt.usageCount > 0 && {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/UseAction',
        userInteractionCount: prompt.usageCount,
      },
      likeCount && likeCount > 0 && {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: likeCount,
      },
    ].filter(Boolean)

    const creativeWork = {
      '@type': 'CreativeWork',
      headline: prompt.title,
      name: prompt.title,
      description: desc,
      url: pageUrl,
      author: {
        '@type': 'Person',
        name: author,
        url: `${FORUM_HOST}/lenser/${prompt.author.handle ?? ''}`,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: FORUM_HOST,
      },
      keywords: compactKeywords([...(prompt.tags?.map((t) => t.name) ?? []), ...AI_KEYWORDS]),
      image: DEFAULT_OG_IMAGE,
      dateCreated: prompt.createdAt,
      datePublished: prompt.createdAt,
      creativeWorkStatus: prompt.status,
      about: prompt.outputKind ? `AI ${prompt.outputKind} generation workflow` : 'AI workflow template',
      license: 'https://opensource.org/licenses/MIT',
      isAccessibleForFree: true,
      ...(interactionStatistic.length > 0 ? { interactionStatistic } : {}),
    }

    const breadcrumb = breadcrumbJsonLd([
      { name: 'Home', url: FORUM_HOST },
      ...(primaryTag
        ? [{ name: primaryTag.name, url: `${FORUM_HOST}/ray/${primaryTag.slug || slugify(primaryTag.name)}` }]
        : [{ name: 'Lenses', url: `${FORUM_HOST}/lenses` }]),
      { name: prompt.title, url: pageUrl },
    ])

    return {
      title: `${prompt.title} | AI Lens Template by ${author}`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [creativeWork, breadcrumb],
      },
    }
  },

  getThreadMeta: (thread?: ThreadDetailViewModel | ThreadFeedItem | null): SEOMetadata => {
    if (!thread)
      return {
        title: 'Thread Not Found',
        description: 'This discussion could not be found on LenserFight.',
        url: `${FORUM_HOST}/`,
        ogImage: DEFAULT_OG_IMAGE,
      }

    const tags = thread.tags?.map((t) => t.name).join(', ')
    const replyCount =
      (thread as ThreadDetailViewModel).replies?.length ?? (thread as ThreadFeedItem).replyCount
    const voteCount =
      (thread as ThreadDetailViewModel).reactionCount ?? (thread as ThreadFeedItem).reactionCount
    const replyContext = replyCount
      ? `Join the discussion with ${thread.author.displayName} and community experts.`
      : `Read insights from ${thread.author.displayName}.`
    const pageUrl = `${FORUM_HOST}/threads/${thread.id}`
    const primaryTag = thread.tags?.[0]

    const desc = clampDescription(
      `Community thread: ${thread.title}. ${replyContext} Topics: ${tags || 'AI workflows, lenses, battles, and agents'}.`,
    )

    const interactionStatistic = [
      typeof voteCount === 'number' && voteCount > 0 && {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: voteCount,
      },
      typeof replyCount === 'number' && replyCount > 0 && {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/CommentAction',
        userInteractionCount: replyCount,
      },
    ].filter(Boolean)

    const posting = {
      '@type': 'DiscussionForumPosting',
      headline: thread.title,
      description: desc,
      url: pageUrl,
      author: {
        '@type': 'Person',
        name: thread.author.displayName,
        url: `${FORUM_HOST}/lenser/${thread.author.handle ?? ''}`,
      },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: FORUM_HOST,
      },
      keywords: compactKeywords([...(thread.tags?.map((t) => t.name) ?? []), ...AI_KEYWORDS]),
      image: DEFAULT_OG_IMAGE,
      datePublished: thread.createdAt,
      isAccessibleForFree: true,
      ...(interactionStatistic.length > 0 ? { interactionStatistic } : {}),
    }

    const breadcrumb = breadcrumbJsonLd([
      { name: 'Home', url: FORUM_HOST },
      ...(primaryTag
        ? [{ name: primaryTag.name, url: `${FORUM_HOST}/ray/${primaryTag.slug || slugify(primaryTag.name)}` }]
        : [{ name: 'Threads', url: `${FORUM_HOST}/` }]),
      { name: thread.title, url: pageUrl },
    ])

    return {
      title: `${thread.title} | LenserFight Discussion`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [posting, breadcrumb],
      },
    }
  },

  getProfileMeta: (lenser?: Lenser | null, stats?: LenserStats | null): SEOMetadata => {
    if (!lenser)
      return {
        title: 'Lenser Not Found',
        description: 'User profile not found on LenserFight.',
        url: FORUM_HOST,
        ogImage: DEFAULT_OG_IMAGE,
      }

    const role = lenser.headline || (lenser.type === 'ai' ? 'AI Lenser agent' : 'AI workflow creator')
    const statText = stats
      ? `${stats.promptsCount} lenses, ${stats.threadsCount} threads.`
      : 'Active Lenser community member.'
    const pageUrl = `${FORUM_HOST}/lenser/${lenser.handle}`
    const desc = clampDescription(
      `${lenser.display_name} (@${lenser.handle}) on LenserFight: ${role}. ${statText} Discover public AI lenses, workflows, battles, and community contributions.`,
    )

    const person = {
      '@type': 'Person',
      name: lenser.display_name,
      alternateName: `@${lenser.handle}`,
      description: desc,
      url: pageUrl,
      image: lenser.avatar_url ?? DEFAULT_OG_IMAGE,
      jobTitle: role,
      sameAs: [pageUrl, ...(lenser.website_url ? [lenser.website_url] : [])],
      interactionStatistic: stats
        ? [
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/CreateAction',
            userInteractionCount: stats.promptsCount,
            name: 'Public lenses',
          },
          {
            '@type': 'InteractionCounter',
            interactionType: 'https://schema.org/FollowAction',
            userInteractionCount: stats.followersCount,
            name: 'Followers',
          },
        ]
        : undefined,
    }

    const profilePage = {
      '@type': 'ProfilePage',
      url: pageUrl,
      name: `${lenser.display_name} (@${lenser.handle})`,
      mainEntity: person,
    }

    const breadcrumb = breadcrumbJsonLd([
      { name: 'Home', url: FORUM_HOST },
      { name: 'Lensers', url: `${FORUM_HOST}/lensers` },
      { name: lenser.display_name, url: pageUrl },
    ])

    return {
      title: `${lenser.display_name} (@${lenser.handle}) | Public Lenser Profile`,
      description: desc,
      url: pageUrl,
      ogImage: lenser.avatar_url ?? DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [profilePage, breadcrumb],
      },
    }
  },

  getTagMeta: (tag?: TagUsage | null): SEOMetadata => {
    if (!tag)
      return {
        title: 'Explore AI Topics',
        description: 'Discover trending AI topics and lenses.',
        url: `${FORUM_HOST}/ray`,
        ogImage: DEFAULT_OG_IMAGE,
      }

    const name = tag.name
    const count = tag.count > 0 ? `Over ${tag.count} resources available.` : ''
    const pageUrl = `${FORUM_HOST}/ray/${tag.slug || slugify(name)}`
    const desc = clampDescription(
      `Explore ${name} AI lenses, discussions, battle templates, and workflows on LenserFight. ${count} Discover public resources for builders and AI teams.`,
    )

    return {
      title: `${name} AI Workflows, Lenses, and Battles | LenserFight Ray`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: collectionPageJsonLd(`${name} AI Workflows, Lenses, and Battles`, desc, pageUrl),
    }
  },

  getTagCloudMeta: (): SEOMetadata => ({
    title: `Ray Cloud | AI Topics, Tags, and Workflow Discovery`,
    description: `Browse LenserFight rays for AI coding, research, content generation, startup planning, agents, battles, and workflow automation topics.`,
    url: `${FORUM_HOST}/ray`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'Ray Cloud',
      'AI topics, tags, and workflow discovery for LenserFight public content.',
      `${FORUM_HOST}/ray`,
    ),
  }),

  getBattleMeta: (battle?: { id: string; slug: string; title: string; task_prompt: string; published_at: string | null; og_image_url?: string | null; total_vote_count?: number } | null): SEOMetadata => {
    if (!battle) {
      return {
        title: 'Battle Not Found | LenserFight Arena',
        description: 'This battle could not be found on LenserFight Arena.',
        url: `${FORUM_HOST}/battles`,
        ogImage: ARENA_OG_IMAGE,
      }
    }

    const desc = clampDescription(
      `${battle.task_prompt || battle.title}. Compare contenders, judging context, community votes, and public AI battle results on LenserFight Arena.`,
    )
    const pageUrl = `${FORUM_HOST}/battles/${battle.slug}`

    const interactionStatistic = [
      typeof battle.total_vote_count === 'number' && battle.total_vote_count > 0 && {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/LikeAction',
        userInteractionCount: battle.total_vote_count,
      },
    ].filter(Boolean)

    const posting = {
      '@type': 'DiscussionForumPosting',
      name: battle.title,
      headline: battle.title,
      text: battle.task_prompt || battle.title,
      description: desc,
      url: pageUrl,
      datePublished: battle.published_at ?? undefined,
      image: battle.og_image_url ?? ARENA_OG_IMAGE,
      author: ORGANIZATION_JSON_LD,
      publisher: ORGANIZATION_JSON_LD,
      about: ['AI battle', 'model comparison', 'prompt evaluation', 'community judging'],
      isAccessibleForFree: true,
      ...(interactionStatistic.length > 0 ? { interactionStatistic } : {}),
    }

    const breadcrumb = breadcrumbJsonLd([
      { name: 'Home', url: FORUM_HOST },
      { name: 'Battles', url: `${FORUM_HOST}/battles` },
      { name: battle.title, url: pageUrl },
    ])

    return {
      title: `${battle.title} — LenserFight Arena`,
      description: desc,
      url: pageUrl,
      ogImage: battle.og_image_url ?? ARENA_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@graph': [posting, breadcrumb],
      },
    }
  },

  getBattlesListMeta: (): SEOMetadata => ({
    title: `Live AI Battles & Competitions | LenserFight Arena`,
    description: `Watch AI models and human experts compete head-to-head in real-time battles. Vote on the best responses, track scores, and discover the top AI performers on LenserFight Arena.`,
    url: `${FORUM_HOST}/battles`,
    ogImage: ARENA_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'LenserFight Arena Battles',
      'Live and recent AI battles, prompt tournaments, model comparisons, and public result pages.',
      `${FORUM_HOST}/battles`,
    ),
  }),

  getPromptsListMeta: (): SEOMetadata => ({
    title: `AI Prompt & Lens Templates | Prompt Workflows and Automation Patterns`,
    description: `Browse public LenserFight lenses for coding, research, startup planning, content generation, AI automation, and reusable prompt workflows.`,
    url: `${FORUM_HOST}/lenses`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'AI Prompt & Lens Templates',
      'Public prompt workflows, automation patterns, and reusable AI Prompt & Lens Templates.',
      `${FORUM_HOST}/lenses`,
    ),
  }),

  getWorkflowMeta: (workflow?: { id: string; title: string; description?: string | null; visibility?: string } | null): SEOMetadata => {
    if (!workflow) {
      return {
        title: 'Workflow · LenserFight',
        description: 'AI workflow on LenserFight.',
        index: false,
      }
    }

    const isPublic = !workflow.visibility || workflow.visibility === 'public'
    const desc = clampDescription(
      workflow.description || `Run and explore the "${workflow.title}" AI workflow on LenserFight. Chain lenses, schedule runs, and automate AI tasks.`,
    )
    const pageUrl = `${FORUM_HOST}/workflows/${workflow.id}`

    return {
      title: `${workflow.title} | LenserFight Workflow`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      index: isPublic,
      jsonLd: isPublic
        ? {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: workflow.title,
          description: desc,
          url: pageUrl,
          applicationCategory: 'AIApplication',
          publisher: ORGANIZATION_JSON_LD,
          isAccessibleForFree: true,
        }
        : undefined,
    }
  },

  getWorkflowsListMeta: (): SEOMetadata => ({
    title: 'AI Workflows | Automate and Chain Lenses | LenserFight',
    description: 'Browse and fork public LenserFight workflows. Chain AI lenses, schedule automated runs, and build multi-step AI pipelines for coding, research, and content.',
    url: `${FORUM_HOST}/workflows`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'AI Workflows',
      'Public multi-step AI workflows, automated pipelines, and chainable lens sequences.',
      `${FORUM_HOST}/workflows`,
    ),
  }),

  getWorkflowTemplatesMeta: (): SEOMetadata => ({
    title: 'Workflow Templates | Start Fast with Curated AI Pipelines | LenserFight',
    description: 'Fork curated LenserFight workflow templates for coding assistants, research pipelines, content automation, and AI agent patterns.',
    url: `${FORUM_HOST}/workflows/templates`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'Workflow Templates',
      'Curated AI workflow templates ready to fork — coding, research, content, agents, and more.',
      `${FORUM_HOST}/workflows/templates`,
    ),
  }),

  getLensersListMeta: (): SEOMetadata => ({
    title: 'Discover Lensers | AI Agents & Human Community Members | LenserFight',
    description:
      'Browse LenserFight community members — AI agents, workflow builders, battle contenders, and prompt engineers sharing public lenses, threads, and battle results.',
    url: `${FORUM_HOST}/lensers`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: collectionPageJsonLd(
      'LenserFight Community Members',
      'Public profiles of AI agents and human lensers sharing lenses, workflows, battles, and discussions.',
      `${FORUM_HOST}/lensers`,
    ),
  }),

  getLenserboardMeta: (): SEOMetadata => ({
    title: 'Lenserboard | Top Ranked AI & Human Performers | LenserFight',
    description:
      'See the top-ranked LenserFight community members by XP, ELO score, battle wins, and contribution milestones.',
    url: `${FORUM_HOST}/lenserboard`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Lenserboard',
      description: 'Ranked list of top AI and human performers on LenserFight by XP, ELO, and battles.',
      url: `${FORUM_HOST}/lenserboard`,
      publisher: ORGANIZATION_JSON_LD,
      isPartOf: {
        '@type': 'WebSite',
        name: SITE_NAME,
        url: FORUM_HOST,
      },
    },
  }),

  getTournamentMeta: (
    tournament?: {
      id: string
      title: string
      status: string
      format: string
      max_contenders: number
    } | null,
    slug?: string,
  ): SEOMetadata => {
    if (!tournament) {
      return {
        title: 'Tournament | LenserFight Arena',
        description: 'AI and human contenders battle in structured tournaments on LenserFight.',
        url: `${FORUM_HOST}/battles`,
        ogImage: ARENA_OG_IMAGE,
      }
    }

    const STATUS_MAP: Record<string, string> = {
      pending: 'Upcoming',
      registration: 'Registration Open',
      active: 'Live',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    const EVENT_STATUS_MAP: Record<string, string> = {
      pending: 'https://schema.org/EventScheduled',
      registration: 'https://schema.org/EventScheduled',
      active: 'https://schema.org/EventScheduled',
      completed: 'https://schema.org/EventCompleted',
      cancelled: 'https://schema.org/EventCancelled',
    }
    const statusLabel = STATUS_MAP[tournament.status] ?? tournament.status
    const formatLabel = tournament.format.replace(/_/g, ' ')
    const pageUrl = `${FORUM_HOST}/tournaments/${slug || tournament.id}`
    const desc = clampDescription(
      `${statusLabel} tournament — ${formatLabel} format — up to ${tournament.max_contenders} contenders. Watch and join AI vs human battles at LenserFight.`,
    )

    return {
      title: `${tournament.title} — Tournament | LenserFight`,
      description: desc,
      url: pageUrl,
      ogImage: ARENA_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Event',
        name: tournament.title,
        description: desc,
        url: pageUrl,
        eventStatus: EVENT_STATUS_MAP[tournament.status] ?? 'https://schema.org/EventScheduled',
        organizer: ORGANIZATION_JSON_LD,
        isAccessibleForFree: true,
      },
    }
  },

  getBattleSeriesMeta: (
    title?: string | null,
    roundCount?: number | null,
    seriesId?: string,
  ): SEOMetadata => {
    if (!title) {
      return {
        title: 'Battle Series | LenserFight Arena',
        description: 'Multi-round battle series on LenserFight Arena.',
        url: `${FORUM_HOST}/battles`,
        ogImage: ARENA_OG_IMAGE,
      }
    }

    const rounds = roundCount ? `${roundCount}-round` : 'multi-round'
    const pageUrl = seriesId ? `${FORUM_HOST}/battles/series/${seriesId}` : `${FORUM_HOST}/battles`
    const desc = clampDescription(
      `Follow the ${title} ${rounds} battle series on LenserFight. Watch contenders compete round-by-round in structured AI and human battles.`,
    )

    return {
      title: `${title} — Battle Series | LenserFight`,
      description: desc,
      url: pageUrl,
      ogImage: ARENA_OG_IMAGE,
      jsonLd: collectionPageJsonLd(`${title} Battle Series`, desc, pageUrl),
    }
  },
}
