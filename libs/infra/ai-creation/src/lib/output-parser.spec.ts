import { describe, it, expect } from 'vitest'
import { parseCreationOutput } from './output-parser'

describe('parseCreationOutput', () => {
  describe('lens parsing', () => {
    it('parses valid lens JSON', () => {
      const raw = JSON.stringify({
        title: 'SEO Optimizer',
        content: 'Optimize [[keyword]] for SEO.',
        description: 'Optimizes content for a target keyword.',
        suggestedTagSlugs: ['seo', 'writing'],
        params: [{ label: 'keyword' }],
      })
      const output = parseCreationOutput(raw, 'lens')
      expect(output.type).toBe('lens')
      if (output.type === 'lens') {
        expect(output.result.title).toBe('SEO Optimizer')
        expect(output.result.params).toEqual([{ label: 'keyword' }])
        expect(output.result.suggestedTagSlugs).toEqual(['seo', 'writing'])
      }
    })

    it('extracts params from [[variable]] syntax in content', () => {
      const raw = JSON.stringify({
        title: 'Template',
        content: 'Write about [[topic]] for [[audience]].',
        description: 'A template.',
        suggestedTagSlugs: [],
        params: [],
      })
      const output = parseCreationOutput(raw, 'lens')
      if (output.type === 'lens') {
        expect(output.result.params.map((p) => p.label)).toEqual(['topic', 'audience'])
      }
    })

    it('extracts JSON from markdown fence wrapper', () => {
      const raw = `\`\`\`json\n${JSON.stringify({ title: 'T', content: 'content here that is long enough', description: 'D', suggestedTagSlugs: [], params: [] })}\n\`\`\``
      expect(() => parseCreationOutput(raw, 'lens')).not.toThrow()
    })

    it('throws when title is missing', () => {
      const raw = JSON.stringify({ content: 'some content that is long enough to pass validation', description: 'd', suggestedTagSlugs: [], params: [] })
      expect(() => parseCreationOutput(raw, 'lens')).toThrow(/title/)
    })

    it('throws when content is too short', () => {
      const raw = JSON.stringify({ title: 'T', content: 'short', description: 'd', suggestedTagSlugs: [], params: [] })
      expect(() => parseCreationOutput(raw, 'lens')).toThrow(/content too short/)
    })

    it('throws when response is plain prose with no JSON', () => {
      expect(() => parseCreationOutput('I cannot help with that.', 'lens')).toThrow()
    })
  })

  describe('workflow parsing', () => {
    it('parses valid workflow JSON', () => {
      const raw = JSON.stringify({
        title: 'Content Pipeline',
        description: 'Researches and drafts content.',
        suggestedLensIds: ['lens-a', 'lens-b'],
      })
      const output = parseCreationOutput(raw, 'workflow')
      expect(output.type).toBe('workflow')
      if (output.type === 'workflow') {
        expect(output.result.title).toBe('Content Pipeline')
        expect(output.result.suggestedLensIds).toEqual(['lens-a', 'lens-b'])
      }
    })

    it('returns empty suggestedLensIds when not an array', () => {
      const raw = JSON.stringify({ title: 'T', description: 'D', suggestedLensIds: null })
      const output = parseCreationOutput(raw, 'workflow')
      if (output.type === 'workflow') expect(output.result.suggestedLensIds).toEqual([])
    })

    it('throws when title is missing', () => {
      const raw = JSON.stringify({ description: 'D', suggestedLensIds: [] })
      expect(() => parseCreationOutput(raw, 'workflow')).toThrow(/title/)
    })
  })

  describe('battle parsing', () => {
    it('parses valid battle JSON with suggestions', () => {
      const raw = JSON.stringify({
        title: 'Haiku Throwdown',
        task_prompt: 'Write a haiku about the ocean at dawn.',
        suggestedTaskSource: 'challenge',
        suggestedContenderStructure: 'ai_vs_ai',
        suggestedJudgingMode: 'community_vote',
        suggestedChallengeType: 'writing',
      })
      const output = parseCreationOutput(raw, 'battle')
      expect(output.type).toBe('battle')
      if (output.type === 'battle') {
        expect(output.result.title).toBe('Haiku Throwdown')
        expect(output.result.task_prompt).toContain('haiku')
        expect(output.result.suggestedTaskSource).toBe('challenge')
        expect(output.result.suggestedContenderStructure).toBe('ai_vs_ai')
        expect(output.result.suggestedJudgingMode).toBe('community_vote')
        expect(output.result.suggestedChallengeType).toBe('writing')
      }
    })

    it('drops invalid enum suggestions to undefined', () => {
      const raw = JSON.stringify({
        title: 'Battle',
        task_prompt: 'A fair, comparable task for all contenders.',
        suggestedTaskSource: 'nonsense',
        suggestedContenderStructure: 'robot_vs_robot',
        suggestedJudgingMode: 'coin_flip',
      })
      const output = parseCreationOutput(raw, 'battle')
      if (output.type === 'battle') {
        expect(output.result.suggestedTaskSource).toBeUndefined()
        expect(output.result.suggestedContenderStructure).toBeUndefined()
        expect(output.result.suggestedJudgingMode).toBeUndefined()
      }
    })

    it('nulls challengeType unless task source is challenge', () => {
      const raw = JSON.stringify({
        title: 'Battle',
        task_prompt: 'A fair, comparable task for all contenders.',
        suggestedTaskSource: 'lens',
        suggestedChallengeType: 'writing',
      })
      const output = parseCreationOutput(raw, 'battle')
      if (output.type === 'battle') {
        expect(output.result.suggestedChallengeType).toBeNull()
      }
    })

    it('throws when title is missing', () => {
      const raw = JSON.stringify({ task_prompt: 'A task long enough to pass.' })
      expect(() => parseCreationOutput(raw, 'battle')).toThrow(/title/)
    })

    it('throws when task_prompt is too short', () => {
      const raw = JSON.stringify({ title: 'Battle', task_prompt: 'hi' })
      expect(() => parseCreationOutput(raw, 'battle')).toThrow(/task_prompt/)
    })
  })
})
