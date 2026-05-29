import { describe, expect, it } from 'vitest'

import { deriveBattleType } from './battle-type-codec'

const cases = [
  ['lens ai/community', { task_source: 'lens', contender_structure: 'ai_vs_ai', judging_mode: 'community_vote' }, 'ai_vs_ai'],
  ['lens ai/ai judge', { task_source: 'lens', contender_structure: 'ai_vs_ai', judging_mode: 'ai_judge' }, 'ai_vs_ai'],
  ['lens ai/rubric', { task_source: 'lens', contender_structure: 'ai_vs_ai', judging_mode: 'rubric_score' }, 'ai_vs_ai'],
  ['lens ai/auto', { task_source: 'lens', contender_structure: 'ai_vs_ai', judging_mode: 'auto_score' }, 'ai_vs_ai'],
  ['lens human/community', { task_source: 'lens', contender_structure: 'human_vs_human', judging_mode: 'community_vote' }, 'human_vs_human_open_votes'],
  ['lens human/ai judge', { task_source: 'lens', contender_structure: 'human_vs_human', judging_mode: 'ai_judge' }, 'human_vs_human_ai_votes'],
  ['lens human/rubric', { task_source: 'lens', contender_structure: 'human_vs_human', judging_mode: 'rubric_score' }, 'human_vs_human_open_votes'],
  ['lens human/auto', { task_source: 'lens', contender_structure: 'human_vs_human', judging_mode: 'auto_score' }, 'human_vs_human_open_votes'],
  ['lens human-vs-ai/community', { task_source: 'lens', contender_structure: 'human_vs_ai', judging_mode: 'community_vote' }, 'human_vs_ai'],
  ['workflow wins over contender axes', { task_source: 'workflow', contender_structure: 'human_vs_human', judging_mode: 'ai_judge' }, 'workflow_battle'],
  ['challenge human open', { task_source: 'challenge', contender_structure: 'human_vs_human', judging_mode: 'community_vote' }, 'human_vs_human_open_votes'],
  ['lenser policy wins for non-challenge', { task_source: 'lens', contender_structure: 'ai_vs_ai', judging_mode: 'community_vote', lenser_battle_policy: { memory_mode: 'personality' } }, 'lenser_battle'],
] as const

describe('deriveBattleType', () => {
  it.each(cases)('derives %s', (_name, axes, expected) => {
    expect(deriveBattleType(axes)).toBe(expected)
  })

  it('uses battle_type only as a compatibility fallback', () => {
    expect(deriveBattleType({ battle_type: 'human_vs_ai' })).toBe('human_vs_ai')
  })

  it('uses workflow_id as a final legacy-row hint', () => {
    expect(deriveBattleType({ workflow_id: 'workflow-1' })).toBe('workflow_battle')
  })
})
