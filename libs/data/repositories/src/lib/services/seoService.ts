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
}

const SITE_NAME = 'LenserFight'
const FORUM_HOST = 'https://forum.lenserfight.com'
const ARENA_HOST = 'https://arena.lenserfight.com'
const DEFAULT_OG_IMAGE = `${FORUM_HOST}/og-banner.png`
const ARENA_OG_IMAGE = `${ARENA_HOST}/og-arena-banner.png`
const DEFAULT_TITLE = 'LenserFight - The AI Lens Engineering Arena'
const DEFAULT_DESC =
  'Join the LenserFight ecosystem. Discover, battle, and share advanced AI lenses for GPT-5, Gemini, Claude, and Midjourney. Connect with top Lensers and master LLM interactions.'

// Keywords for injection based on context
const AI_KEYWORDS = [
  'Generative AI',
  'LLM',
  'Prompt Engineering',
  'GPT-5',
  'Gemini Ultra',
  'Claude 3',
  'Lenser AI',
  'Midjourney v6',
  'Stable Diffusion',
  'Sora',
]

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

    const tags = prompt.tags?.map((t) => t.name).join(', ') || 'AI'
    const author = prompt.author.displayName
    const uses = prompt.usageCount > 0 ? `Used ${prompt.usageCount} times.` : ''
    const pageUrl = `${FORUM_HOST}/lenses/${prompt.id}`

    const desc = `Use the "${prompt.title}" lens template by ${author}. Optimized for ${tags}. ${uses} Copy and remix this lens for GPT-5, Gemini, and Claude on LenserFight.`

    return {
      title: `${prompt.title} - AI Lens Template | ${SITE_NAME}`,
      description: desc.substring(0, 160),
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: prompt.title,
        description: desc.substring(0, 160),
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
        keywords: [...(prompt.tags?.map((t) => t.name) ?? []), ...AI_KEYWORDS].join(', '),
        image: DEFAULT_OG_IMAGE,
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

    const tags = thread.tags?.map((t) => t.name).join(' ')
    const replyContext = (thread as ThreadDetailViewModel).replies?.length
      ? `Join the discussion with ${thread.author.displayName} and community experts.`
      : `Read insights from ${thread.author.displayName}.`
    const pageUrl = `${FORUM_HOST}/threads/${thread.id}`

    const desc = `Community thread: ${thread.title}. ${replyContext} Topics: ${tags} #GenerativeAI #LensEngineering. Explore LenserFight for advanced LLM tactics.`

    return {
      title: `${thread.title} - AI Discussion | ${SITE_NAME}`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
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
        keywords: [...(thread.tags?.map((t) => t.name) ?? []), ...AI_KEYWORDS].join(', '),
        image: DEFAULT_OG_IMAGE,
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

    const role = lenser.headline || 'AI Creator'
    const statText = stats
      ? `${stats.promptsCount} lenses, ${stats.threadsCount} threads.`
      : 'Active Lenser community member.'
    const pageUrl = `${FORUM_HOST}/lenser/${lenser.handle}`
    const desc = `Check out ${lenser.display_name}'s profile on LenserFight. ${role}. ${statText} Follow for top-tier AI lenses, LLM strategies, and ConnectLens ecosystem contributions.`

    return {
      title: `${lenser.display_name} (@${lenser.handle}) - ${role} | ${SITE_NAME}`,
      description: desc,
      url: pageUrl,
      ogImage: lenser.avatar_url ?? DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: lenser.display_name,
        alternateName: `@${lenser.handle}`,
        description: desc,
        url: pageUrl,
        image: lenser.avatar_url ?? DEFAULT_OG_IMAGE,
        jobTitle: role,
        sameAs: [`${FORUM_HOST}/lenser/${lenser.handle}`],
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
    const pageUrl = `${FORUM_HOST}/ray/${name.toLowerCase()}`
    const desc = `Explore the best ${name} lenses, discussions, and challenges. ${count} Master ${name} workflows with GPT-5, Gemini, and Claude tools on LenserFight.`

    return {
      title: `Top ${name} AI Lenses & Threads | ${SITE_NAME}`,
      description: desc,
      url: pageUrl,
      ogImage: DEFAULT_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: `${name} AI Lenses & Threads`,
        description: desc,
        url: pageUrl,
        publisher: { '@type': 'Organization', name: SITE_NAME, url: FORUM_HOST },
      },
    }
  },

  getTagCloudMeta: (): SEOMetadata => ({
    title: `Explore AI Topics & Trends | ${SITE_NAME}`,
    description: `Browse trending tags in the LenserFight ecosystem. Find lenses for Coding, Art, Writing, Marketing, and more. Optimized for the latest LLMs.`,
    url: `${FORUM_HOST}/ray`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI Topics & Trends',
      url: `${FORUM_HOST}/ray`,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: FORUM_HOST },
    },
  }),

  getBattleMeta: (battle?: { id: string; slug: string; title: string; task_prompt: string; published_at: string | null; og_image_url?: string | null } | null): SEOMetadata => {
    if (!battle) {
      return {
        title: 'Battle Not Found | LenserFight Arena',
        description: 'This battle could not be found on LenserFight Arena.',
        url: `${ARENA_HOST}/battles`,
        ogImage: ARENA_OG_IMAGE,
      }
    }

    const desc = `${battle.task_prompt}`.substring(0, 155) + (battle.task_prompt.length > 155 ? '…' : '')
    const pageUrl = `${ARENA_HOST}/battles/${battle.slug}`

    return {
      title: `${battle.title} — LenserFight Arena`,
      description: desc,
      url: pageUrl,
      ogImage: battle.og_image_url ?? ARENA_OG_IMAGE,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: battle.title,
        description: desc,
        url: pageUrl,
        startDate: battle.published_at ?? undefined,
        organizer: {
          '@type': 'Organization',
          name: SITE_NAME,
          url: ARENA_HOST,
        },
        location: {
          '@type': 'VirtualLocation',
          url: pageUrl,
        },
      },
    }
  },

  getBattlesListMeta: (): SEOMetadata => ({
    title: `Live AI Battles & Competitions | LenserFight Arena`,
    description: `Watch AI models and human experts compete head-to-head in real-time battles. Vote on the best responses, track scores, and discover the top AI performers on LenserFight Arena.`,
    url: `${ARENA_HOST}/battles`,
    ogImage: ARENA_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'LenserFight Arena Battles',
      description: 'Live competitive AI battles',
      url: `${ARENA_HOST}/battles`,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: ARENA_HOST },
    },
  }),

  getPromptsListMeta: (): SEOMetadata => ({
    title: `Discover Best AI Lenses | ${SITE_NAME}`,
    description: `Search and filter thousands of high-quality AI lenses. Categories include Writing, Coding, Art Generation (Midjourney/DALL-E), and Productivity. Boost your LLM workflow.`,
    url: `${FORUM_HOST}/lenses`,
    ogImage: DEFAULT_OG_IMAGE,
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI Lens Library',
      url: `${FORUM_HOST}/lenses`,
      publisher: { '@type': 'Organization', name: SITE_NAME, url: FORUM_HOST },
    },
  }),
}
