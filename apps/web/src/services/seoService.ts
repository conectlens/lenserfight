import { Lenser, LenserStats } from '../types/lenser.types'
import { PromptTemplateDetailViewModel, PromptTemplateViewModel } from '../types/prompts.types'
import { TagUsage } from '../types/tags.types'
import { ThreadDetailViewModel, ThreadFeedItem } from '../types/threads.types'

export interface SEOMetadata {
  title: string
  description: string
}

const SITE_NAME = 'LenserFight'
const DEFAULT_TITLE = 'LenserFight - The AI Prompt Engineering Arena'
const DEFAULT_DESC =
  'Join the LenserFight ecosystem. Discover, battle, and share advanced AI prompts for GPT-5, Gemini, Claude, and Midjourney. Connect with top Lensers and master LLM interactions.'

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
  }),

  getPromptMeta: (
    prompt?: PromptTemplateDetailViewModel | PromptTemplateViewModel | null
  ): SEOMetadata => {
    if (!prompt)
      return {
        title: 'Prompt Not Found',
        description: 'This prompt template could not be found on LenserFight.',
      }

    const tags = prompt.tags?.map((t) => t.name).join(', ') || 'AI'
    const author = prompt.author.displayName
    const uses = prompt.usageCount > 0 ? `Used ${prompt.usageCount} times.` : ''

    // Construct rich description
    const desc = `Use the "${prompt.title}" prompt template by ${author}. Optimized for ${tags}. ${uses} Copy and remix this prompt for GPT-5, Gemini, and Claude on LenserFight.`

    return {
      title: `${prompt.title} - AI Prompt Template | ${SITE_NAME}`,
      description: desc.substring(0, 160), // Truncate for optimal SERP display
    }
  },

  getThreadMeta: (thread?: ThreadDetailViewModel | ThreadFeedItem | null): SEOMetadata => {
    if (!thread)
      return {
        title: 'Thread Not Found',
        description: 'This discussion could not be found on LenserFight.',
      }

    const tags = thread.tags?.map((t) => t.name).join(' ')
    const replyContext = (thread as ThreadDetailViewModel).replies?.length
      ? `Join the discussion with ${thread.author.displayName} and community experts.`
      : `Read insights from ${thread.author.displayName}.`

    return {
      title: `${thread.title} - AI Discussion | ${SITE_NAME}`,
      description: `Community thread: ${thread.title}. ${replyContext} Topics: ${tags} #GenerativeAI #PromptEngineering. Explore LenserFight for advanced LLM tactics.`,
    }
  },

  getProfileMeta: (lenser?: Lenser | null, stats?: LenserStats | null): SEOMetadata => {
    if (!lenser)
      return { title: 'Lenser Not Found', description: 'User profile not found on LenserFight.' }

    const role = lenser.headline || 'AI Creator'
    const statText = stats
      ? `${stats.promptsCount} prompts, ${stats.threadsCount} threads.`
      : 'Active Lenser community member.'

    return {
      title: `${lenser.display_name} (@${lenser.handle}) - ${role} | ${SITE_NAME}`,
      description: `Check out ${lenser.display_name}'s profile on LenserFight. ${role}. ${statText} Follow for top-tier AI prompts, LLM strategies, and ConnectLens ecosystem contributions.`,
    }
  },

  getTagMeta: (tag?: TagUsage | null): SEOMetadata => {
    if (!tag)
      return { title: 'Explore AI Topics', description: 'Discover trending AI topics and prompts.' }

    const name = tag.name
    const count = tag.count > 0 ? `Over ${tag.count} resources available.` : ''

    return {
      title: `Top ${name} AI Prompts & Threads | ${SITE_NAME}`,
      description: `Explore the best ${name} prompts, discussions, and challenges. ${count} Master ${name} workflows with GPT-5, Gemini, and Claude tools on LenserFight.`,
    }
  },

  getTagCloudMeta: (): SEOMetadata => ({
    title: `Explore AI Topics & Trends | ${SITE_NAME}`,
    description: `Browse trending tags in the LenserFight ecosystem. Find prompts for Coding, Art, Writing, Marketing, and more. Optimized for the latest LLMs.`,
  }),

  getPromptsListMeta: (): SEOMetadata => ({
    title: `Discover Best AI Prompts | ${SITE_NAME}`,
    description: `Search and filter thousands of high-quality AI prompts. Categories include Writing, Coding, Art Generation (Midjourney/DALL-E), and Productivity. Boost your LLM workflow.`,
  }),
}
