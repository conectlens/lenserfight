import { describe, it, expect, vi } from 'vitest'

// Mock all layout components to avoid React/data-layer circular dep in unit tests
vi.mock('./TextBattleLayout', () => ({ TextBattleLayout: vi.fn() }))
vi.mock('./ImageBattleLayout', () => ({ ImageBattleLayout: vi.fn() }))
vi.mock('./AudioBattleLayout', () => ({ AudioBattleLayout: vi.fn() }))
vi.mock('./VideoBattleLayout', () => ({ VideoBattleLayout: vi.fn() }))
vi.mock('./WorkflowBattleLayout', () => ({ WorkflowBattleLayout: vi.fn() }))
vi.mock('./GenericBattleLayout', () => ({ GenericBattleLayout: vi.fn() }))

import { resolveBattleLayout, LAYOUT_REGISTRY } from './BattleLayoutResolver'
import type { Battle } from '../../../types/battle.types'

function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'b1',
    slug: 'test-battle',
    title: 'Test Battle',
    task_prompt: 'Do the thing',
    status: 'open',
    total_vote_count: 0,
    published_at: null,
    voting_opens_at: null,
    voting_closes_at: null,
    battle_type: 'ai_vs_ai',
    voter_eligibility: 'open',
    handicap_config: {},
    creator_lenser_id: null,
    forum_thread_id: null,
    workflow_id: null,
    lens_id: null,
    execution_starts_at: null,
    auto_publish: false,
    voting_duration_hours: 24,
    vote_velocity: 0,
    og_image_url: null,
    content_type: null,
    ...overrides,
  }
}

describe('resolveBattleLayout', () => {
  describe('content_type routing', () => {
    it('resolves text content_type → text layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'text' }))
      expect(result.layoutId).toBe('text')
    })

    it('resolves code content_type → text layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'code' }))
      expect(result.layoutId).toBe('text')
    })

    it('resolves poem content_type → text layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'poem' }))
      expect(result.layoutId).toBe('text')
    })

    it('resolves kaggle content_type → text layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'kaggle' }))
      expect(result.layoutId).toBe('text')
    })

    it('resolves image content_type → image layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'image' }))
      expect(result.layoutId).toBe('image')
    })

    it('resolves drawing content_type → image layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'drawing' }))
      expect(result.layoutId).toBe('image')
    })

    it('resolves avatar content_type → image layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'avatar' }))
      expect(result.layoutId).toBe('image')
    })

    it('resolves image_edit content_type → image layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'image_edit' }))
      expect(result.layoutId).toBe('image')
    })

    it('resolves audio content_type → audio layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'audio' }))
      expect(result.layoutId).toBe('audio')
    })

    it('resolves video content_type → video layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'video' }))
      expect(result.layoutId).toBe('video')
    })

    it('resolves workflow content_type → workflow layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'workflow' }))
      expect(result.layoutId).toBe('workflow')
    })

    it('resolves map content_type → generic layout', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'map' }))
      expect(result.layoutId).toBe('generic')
    })
  })

  describe('battle_type override (higher priority than content_type)', () => {
    it('workflow_battle overrides text content_type → workflow layout', () => {
      const result = resolveBattleLayout(
        makeBattle({ battle_type: 'workflow_battle', content_type: 'text' })
      )
      expect(result.layoutId).toBe('workflow')
    })

    it('workflow_battle overrides image content_type → workflow layout', () => {
      const result = resolveBattleLayout(
        makeBattle({ battle_type: 'workflow_battle', content_type: 'image' })
      )
      expect(result.layoutId).toBe('workflow')
    })
  })

  describe('fallback behaviour', () => {
    it('returns text layout when content_type is null', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: null }))
      expect(result.layoutId).toBe('text')
    })

    it('returns text layout when content_type is unknown string', () => {
      const result = resolveBattleLayout(makeBattle({ content_type: 'unsupported_type' as never }))
      expect(result.layoutId).toBe('text')
    })

    it('non-workflow battle_type does NOT override content_type routing', () => {
      const result = resolveBattleLayout(
        makeBattle({ battle_type: 'ai_vs_ai', content_type: 'image' })
      )
      expect(result.layoutId).toBe('image')
    })
  })

  describe('layout strategy contract', () => {
    it('every resolved strategy has a Layout component', () => {
      const contentTypes = ['text', 'code', 'poem', 'image', 'drawing', 'avatar', 'image_edit', 'audio', 'video', 'workflow']
      contentTypes.forEach((ct) => {
        const strategy = resolveBattleLayout(makeBattle({ content_type: ct as never }))
        expect(strategy.Layout).toBeDefined()
        expect(typeof strategy.Layout).toBe('function')
      })
    })

    it('every entry in LAYOUT_REGISTRY has a layoutId and Layout', () => {
      Object.entries(LAYOUT_REGISTRY).forEach(([key, strategy]) => {
        expect(strategy.layoutId).toBe(key)
        expect(typeof strategy.Layout).toBe('function')
      })
    })
  })
})
