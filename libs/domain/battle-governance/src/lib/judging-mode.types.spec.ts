import {
  JUDGING_MODES,
  JUDGING_MODE_LABEL,
  JUDGING_MODE_DESCRIPTION,
  JUDGING_BY_CONTENDER,
  RECOMMENDED_JUDGING_BY_CONTENDER,
  isJudgingAllowedForContender,
  getRecommendedJudging,
  getAllowedJudgingForContender,
  getJudgingDisabledReason,
  isExperimentalJudgingMode,
} from './judging-mode.types'
import { CONTENDER_STRUCTURES } from './contender-structure.types'

describe('judging-mode.types', () => {
  it('defines exactly 4 judging modes', () => {
    expect(JUDGING_MODES).toHaveLength(4)
    expect(JUDGING_MODES).toContain('community_vote')
    expect(JUDGING_MODES).toContain('ai_judge')
    expect(JUDGING_MODES).toContain('rubric_score')
    expect(JUDGING_MODES).toContain('auto_score')
  })

  it('provides labels for every judging mode', () => {
    for (const mode of JUDGING_MODES) {
      expect(JUDGING_MODE_LABEL[mode]).toBeTruthy()
    }
  })

  it('provides descriptions for every judging mode', () => {
    for (const mode of JUDGING_MODES) {
      expect(JUDGING_MODE_DESCRIPTION[mode]).toBeTruthy()
    }
  })

  describe('experimental flags', () => {
    it('marks rubric_score and auto_score as experimental', () => {
      expect(isExperimentalJudgingMode('rubric_score')).toBe(true)
      expect(isExperimentalJudgingMode('auto_score')).toBe(true)
    })

    it('marks community_vote and ai_judge as non-experimental', () => {
      expect(isExperimentalJudgingMode('community_vote')).toBe(false)
      expect(isExperimentalJudgingMode('ai_judge')).toBe(false)
    })
  })

  describe('JUDGING_BY_CONTENDER matrix', () => {
    it('covers every contender structure', () => {
      for (const cs of CONTENDER_STRUCTURES) {
        expect(JUDGING_BY_CONTENDER[cs]).toBeDefined()
        expect(JUDGING_BY_CONTENDER[cs].length).toBeGreaterThan(0)
      }
    })

    it('ai_vs_ai allows community_vote and ai_judge', () => {
      expect(JUDGING_BY_CONTENDER.ai_vs_ai).toContain('community_vote')
      expect(JUDGING_BY_CONTENDER.ai_vs_ai).toContain('ai_judge')
      expect(JUDGING_BY_CONTENDER.ai_vs_ai).not.toContain('auto_score')
    })

    it('human_vs_human allows all judging modes', () => {
      expect(JUDGING_BY_CONTENDER.human_vs_human).toContain('community_vote')
      expect(JUDGING_BY_CONTENDER.human_vs_human).toContain('ai_judge')
      expect(JUDGING_BY_CONTENDER.human_vs_human).toContain('rubric_score')
      expect(JUDGING_BY_CONTENDER.human_vs_human).toContain('auto_score')
    })

    it('human_vs_ai allows community_vote and ai_judge', () => {
      expect(JUDGING_BY_CONTENDER.human_vs_ai).toContain('community_vote')
      expect(JUDGING_BY_CONTENDER.human_vs_ai).toContain('ai_judge')
    })
  })

  describe('isJudgingAllowedForContender', () => {
    it('returns true for null contender (pre-selection)', () => {
      for (const mode of JUDGING_MODES) {
        expect(isJudgingAllowedForContender(null, mode)).toBe(true)
      }
    })

    it('rejects auto_score for ai_vs_ai', () => {
      expect(isJudgingAllowedForContender('ai_vs_ai', 'auto_score')).toBe(false)
    })

    it('allows auto_score for human_vs_human', () => {
      expect(isJudgingAllowedForContender('human_vs_human', 'auto_score')).toBe(true)
    })
  })

  describe('getRecommendedJudging', () => {
    it('returns null for null contender', () => {
      expect(getRecommendedJudging(null)).toBeNull()
    })

    it('recommends community_vote for all contender structures', () => {
      for (const cs of CONTENDER_STRUCTURES) {
        expect(getRecommendedJudging(cs)).toBe('community_vote')
      }
    })

    it('every recommendation is in the allowed set', () => {
      for (const cs of CONTENDER_STRUCTURES) {
        const rec = RECOMMENDED_JUDGING_BY_CONTENDER[cs]
        expect(JUDGING_BY_CONTENDER[cs]).toContain(rec)
      }
    })
  })

  describe('getAllowedJudgingForContender', () => {
    it('returns all modes when contender is null', () => {
      expect(getAllowedJudgingForContender(null)).toEqual(JUDGING_MODES)
    })
  })

  describe('getJudgingDisabledReason', () => {
    it('returns null for null contender', () => {
      expect(getJudgingDisabledReason(null, 'community_vote')).toBeNull()
    })

    it('returns null for allowed combinations', () => {
      expect(getJudgingDisabledReason('ai_vs_ai', 'community_vote')).toBeNull()
    })

    it('returns reason for disallowed combinations', () => {
      expect(getJudgingDisabledReason('ai_vs_ai', 'auto_score')).toBeTruthy()
    })
  })
})
