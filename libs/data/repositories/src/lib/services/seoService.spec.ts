import { describe, expect, it } from 'vitest'

import { seoService } from './seoService'

describe('seoService', () => {
  it('generates rich metadata for public lens pages', () => {
    const meta = seoService.getPromptMeta({
      id: 'github-review-workflow',
      title: 'GitHub Review Workflow',
      description: 'Review pull requests with structured AI critique and contributor-ready recommendations.',
      author: {
        id: 'lenser-1',
        displayName: 'Open Source Builder',
        handle: 'oss-builder',
      },
      tags: [
        {
          id: 'tag-1',
          slug: 'github-review',
          name: 'GitHub Review',
          visibility: 'public',
          created_at: '2026-05-12T00:00:00Z',
        },
      ],
      usageCount: 42,
      createdAt: '2026-05-12T00:00:00Z',
      visibility: 'public',
      status: 'published',
      outputKind: 'text',
    })

    expect(meta.title).toBe('GitHub Review Workflow | AI Lens Template by Open Source Builder')
    expect(meta.url).toBe('https://lenserfight.com/lenses/github-review-workflow')
    expect(meta.description).toContain('Review pull requests')
    expect(meta.jsonLd?.['@type']).toBe('CreativeWork')
    expect(meta.jsonLd?.keywords).toContain('GitHub Review')
  })

  it('canonicalizes ray pages by slug and uses collection schema', () => {
    const meta = seoService.getTagMeta({
      id: 'tag-1',
      slug: 'startup-planning',
      name: 'Startup Planning',
      visibility: 'public',
      created_at: '2026-05-12T00:00:00Z',
      count: 12,
      trendingScore: 10,
    })

    expect(meta.url).toBe('https://lenserfight.com/ray/startup-planning')
    expect(meta.title).toContain('Startup Planning AI Workflows')
    expect(meta.jsonLd?.['@type']).toBe('CollectionPage')
  })

  it('generates public profile metadata with profile schema and stats', () => {
    const meta = seoService.getProfileMeta(
      {
        id: 'lenser-1',
        handle: 'ai-founder',
        display_name: 'AI Founder',
        headline: 'Startup workflow builder',
        avatar_url: 'https://cdn.example.test/avatar.png',
        created_at: '2026-05-12T00:00:00Z',
        type: 'human',
      },
      {
        threadsCount: 3,
        promptsCount: 7,
        followersCount: 21,
        followingCount: 5,
      },
    )

    expect(meta.title).toBe('AI Founder (@ai-founder) | Public Lenser Profile')
    expect(meta.ogImage).toBe('https://cdn.example.test/avatar.png')
    expect(meta.jsonLd?.['@type']).toBe('Person')
    expect(meta.jsonLd?.interactionStatistic).toHaveLength(2)
  })

  it('generates battle metadata as a shareable creative work', () => {
    const meta = seoService.getBattleMeta({
      id: 'battle-1',
      slug: 'claude-vs-gpt-code-review',
      title: 'Claude vs GPT Code Review',
      task_prompt: 'Compare two model-generated pull request reviews and vote for the most actionable review.',
      published_at: '2026-05-12T00:00:00Z',
      og_image_url: null,
    })

    expect(meta.url).toBe('https://arena.lenserfight.com/battles/claude-vs-gpt-code-review')
    expect(meta.description).toContain('Compare two model-generated')
    expect(meta.jsonLd?.['@type']).toBe('CreativeWork')
    expect(meta.jsonLd?.about).toContain('model comparison')
  })
})
