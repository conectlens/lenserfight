import {
  CONTENDER_STRUCTURES,
  CONTENDER_STRUCTURE_LABEL,
  CONTENDER_STRUCTURE_DESCRIPTION,
  CONTENDER_BY_TASK_SOURCE,
  RECOMMENDED_CONTENDER_BY_TASK_SOURCE,
  isContenderAllowedForTaskSource,
  getRecommendedContender,
  getAllowedContendersForTaskSource,
  getContenderDisabledReason,
  hasHumanContenders,
} from './contender-structure.types'
import { TASK_SOURCES } from './task-source.types'

describe('contender-structure.types', () => {
  it('defines exactly 3 contender structures', () => {
    expect(CONTENDER_STRUCTURES).toHaveLength(3)
    expect(CONTENDER_STRUCTURES).toContain('ai_vs_ai')
    expect(CONTENDER_STRUCTURES).toContain('human_vs_human')
    expect(CONTENDER_STRUCTURES).toContain('human_vs_ai')
  })

  it('provides labels for every contender structure', () => {
    for (const cs of CONTENDER_STRUCTURES) {
      expect(CONTENDER_STRUCTURE_LABEL[cs]).toBeTruthy()
    }
  })

  it('provides descriptions for every contender structure', () => {
    for (const cs of CONTENDER_STRUCTURES) {
      expect(CONTENDER_STRUCTURE_DESCRIPTION[cs]).toBeTruthy()
    }
  })

  describe('CONTENDER_BY_TASK_SOURCE matrix', () => {
    it('covers every task source', () => {
      for (const source of TASK_SOURCES) {
        expect(CONTENDER_BY_TASK_SOURCE[source]).toBeDefined()
        expect(CONTENDER_BY_TASK_SOURCE[source].length).toBeGreaterThan(0)
      }
    })

    it('lens allows all three structures', () => {
      expect(CONTENDER_BY_TASK_SOURCE.lens).toContain('ai_vs_ai')
      expect(CONTENDER_BY_TASK_SOURCE.lens).toContain('human_vs_ai')
      expect(CONTENDER_BY_TASK_SOURCE.lens).toContain('human_vs_human')
    })

    it('workflow allows ai_vs_ai and human_vs_ai only', () => {
      expect(CONTENDER_BY_TASK_SOURCE.workflow).toContain('ai_vs_ai')
      expect(CONTENDER_BY_TASK_SOURCE.workflow).toContain('human_vs_ai')
      expect(CONTENDER_BY_TASK_SOURCE.workflow).not.toContain('human_vs_human')
    })

    it('challenge allows only human-involving structures', () => {
      expect(CONTENDER_BY_TASK_SOURCE.challenge).toContain('human_vs_human')
      expect(CONTENDER_BY_TASK_SOURCE.challenge).toContain('human_vs_ai')
      expect(CONTENDER_BY_TASK_SOURCE.challenge).not.toContain('ai_vs_ai')
    })
  })

  describe('isContenderAllowedForTaskSource', () => {
    it('returns true for null task source (pre-selection)', () => {
      for (const cs of CONTENDER_STRUCTURES) {
        expect(isContenderAllowedForTaskSource(null, cs)).toBe(true)
      }
    })

    it('validates challenge rejects ai_vs_ai', () => {
      expect(isContenderAllowedForTaskSource('challenge', 'ai_vs_ai')).toBe(false)
    })

    it('validates workflow rejects human_vs_human', () => {
      expect(isContenderAllowedForTaskSource('workflow', 'human_vs_human')).toBe(false)
    })
  })

  describe('getRecommendedContender', () => {
    it('returns null for null task source', () => {
      expect(getRecommendedContender(null)).toBeNull()
    })

    it('recommends ai_vs_ai for lens and workflow', () => {
      expect(getRecommendedContender('lens')).toBe('ai_vs_ai')
      expect(getRecommendedContender('workflow')).toBe('ai_vs_ai')
    })

    it('recommends human_vs_human for challenge', () => {
      expect(getRecommendedContender('challenge')).toBe('human_vs_human')
    })

    it('every recommendation is in the allowed set', () => {
      for (const source of TASK_SOURCES) {
        const rec = RECOMMENDED_CONTENDER_BY_TASK_SOURCE[source]
        expect(CONTENDER_BY_TASK_SOURCE[source]).toContain(rec)
      }
    })
  })

  describe('getAllowedContendersForTaskSource', () => {
    it('returns all structures when task source is null', () => {
      expect(getAllowedContendersForTaskSource(null)).toEqual(CONTENDER_STRUCTURES)
    })
  })

  describe('getContenderDisabledReason', () => {
    it('returns null for null task source', () => {
      expect(getContenderDisabledReason(null, 'ai_vs_ai')).toBeNull()
    })

    it('returns null for allowed combinations', () => {
      expect(getContenderDisabledReason('lens', 'ai_vs_ai')).toBeNull()
    })

    it('returns reason for disallowed combinations', () => {
      expect(getContenderDisabledReason('challenge', 'ai_vs_ai')).toBeTruthy()
    })
  })

  describe('hasHumanContenders', () => {
    it('returns false for ai_vs_ai', () => {
      expect(hasHumanContenders('ai_vs_ai')).toBe(false)
    })

    it('returns true for human_vs_human and human_vs_ai', () => {
      expect(hasHumanContenders('human_vs_human')).toBe(true)
      expect(hasHumanContenders('human_vs_ai')).toBe(true)
    })
  })
})
