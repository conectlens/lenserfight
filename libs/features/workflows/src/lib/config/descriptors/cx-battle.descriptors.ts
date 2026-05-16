/**
 * CX — Battle node config descriptors.
 *
 * Covers: battle_create, battle_execute, contender_run, judge_battle,
 *         vote_collector, score_aggregator, leaderboard_update.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const battleCreateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'battle_create',
  displayName: 'Battle Create',
  category: 'battle',
  fields: [
    {
      key: 'promptTemplateId',
      label: 'Prompt Template ID',
      type: 'text',
      required: true,
    },
    {
      key: 'contenderLensIds',
      label: 'Contender Lens IDs',
      type: 'json',
      required: true,
      hint: 'Array of Lens UUIDs.',
    },
    {
      key: 'title',
      label: 'Battle Title',
      type: 'text',
    },
    {
      key: 'visibility',
      label: 'Visibility',
      type: 'select',
      defaultValue: 'public',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
        { label: 'Unlisted', value: 'unlisted' },
      ],
    },
    {
      key: 'judgeStrategy',
      label: 'Judge Strategy',
      type: 'select',
      defaultValue: 'community_vote',
      options: [
        { label: 'AI Judge', value: 'ai_judge' },
        { label: 'Community Vote', value: 'community_vote' },
        { label: 'Hybrid', value: 'hybrid' },
      ],
    },
    {
      key: 'maxRounds',
      label: 'Max Rounds',
      type: 'number',
      defaultValue: '3',
      min: 1,
      max: 10,
    },
    {
      key: 'fundingSource',
      label: 'Funding Source',
      type: 'select',
      defaultValue: 'platform',
      options: [
        { label: 'Platform', value: 'platform' },
        { label: 'User BYOK', value: 'user_byok' },
      ],
    },
  ],
  outputFields: [
    { key: 'battleId', type: 'string', description: 'Created battle ID' },
    { key: 'battle', type: 'object', description: 'Full battle object' },
  ],
}

export const battleExecuteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'battle_execute',
  displayName: 'Battle Execute',
  category: 'battle',
  fields: [
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: '60000',
      min: 5000,
      max: 300000,
    },
    {
      key: 'parallel',
      label: 'Run Contenders in Parallel',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'results', type: 'array', description: 'Contender execution results' },
    { key: 'durationMs', type: 'number', description: 'Total execution duration' },
  ],
}

export const contenderRunDescriptor: RunnerConfigDescriptor = {
  nodeType: 'contender_run',
  displayName: 'Contender Run',
  category: 'battle',
  needsAiProvider: true,
  fields: [
    {
      key: 'lensId',
      label: 'Lens ID',
      type: 'text',
      required: true,
    },
    {
      key: 'slot',
      label: 'Slot',
      type: 'select',
      required: true,
      options: [
        { label: 'A', value: 'A' },
        { label: 'B', value: 'B' },
      ],
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
    },
  ],
  outputFields: [
    { key: 'output', type: 'string', description: 'Contender response text' },
    { key: 'metadata', type: 'object', description: 'Execution metadata (tokens, latency)' },
  ],
}

export const judgeBattleDescriptor: RunnerConfigDescriptor = {
  nodeType: 'judge_battle',
  displayName: 'Judge Battle',
  category: 'battle',
  needsAiProvider: true,
  fields: [
    {
      key: 'judgeLensId',
      label: 'Judge Lens ID',
      type: 'text',
      required: true,
    },
    {
      key: 'rubric',
      label: 'Judging Rubric',
      type: 'textarea',
      required: true,
      rows: 4,
    },
    {
      key: 'scoringScale',
      label: 'Scoring Scale',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 100,
    },
    {
      key: 'tieBreakRule',
      label: 'Tie Break Rule',
      type: 'select',
      defaultValue: 'higher_creativity',
      options: [
        { label: 'Higher Creativity', value: 'higher_creativity' },
        { label: 'Random', value: 'random' },
        { label: 'No Tie', value: 'no_tie' },
      ],
    },
    {
      key: 'confidenceThreshold',
      label: 'Confidence Threshold',
      type: 'number',
      defaultValue: '0.7',
      min: 0,
      max: 1,
      step: 0.05,
    },
  ],
  outputFields: [
    { key: 'scores', type: 'object', description: 'Scores per contender' },
    { key: 'winner', type: 'string', description: 'Winner slot or draw' },
    { key: 'reasoning', type: 'string', description: 'Judge reasoning' },
  ],
}

export const voteCollectorDescriptor: RunnerConfigDescriptor = {
  nodeType: 'vote_collector',
  displayName: 'Vote Collector',
  category: 'battle',
  fields: [
    {
      key: 'battleId',
      label: 'Battle ID',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'durationMs',
      label: 'Voting Duration (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 60000,
      max: 604800000,
      hint: 'Max 7 days.',
    },
    {
      key: 'minVotes',
      label: 'Minimum Votes',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 1000,
    },
    {
      key: 'closingStrategy',
      label: 'Closing Strategy',
      type: 'select',
      defaultValue: 'time_or_quorum',
      options: [
        { label: 'Time or Quorum', value: 'time_or_quorum' },
        { label: 'Time Only', value: 'time_only' },
        { label: 'Quorum Only', value: 'quorum_only' },
      ],
    },
  ],
  outputFields: [
    { key: 'votes', type: 'object', description: 'Vote tallies per contender' },
    { key: 'totalVotes', type: 'number', description: 'Total votes cast' },
  ],
}

export const scoreAggregatorDescriptor: RunnerConfigDescriptor = {
  nodeType: 'score_aggregator',
  displayName: 'Score Aggregator',
  category: 'battle',
  fields: [
    {
      key: 'weights',
      label: 'Score Weights',
      type: 'json',
      required: true,
      hint: '{ judge: 0.6, community: 0.4 }',
    },
    {
      key: 'tieBreaker',
      label: 'Tie Breaker',
      type: 'select',
      defaultValue: 'judge_preferred',
      options: [
        { label: 'Judge Preferred', value: 'judge_preferred' },
        { label: 'Community Preferred', value: 'community_preferred' },
        { label: 'Draw', value: 'draw' },
      ],
    },
    {
      key: 'minimumMargin',
      label: 'Minimum Margin',
      type: 'number',
      defaultValue: '0.05',
      min: 0,
      max: 1,
      step: 0.01,
    },
  ],
  outputFields: [
    { key: 'finalScores', type: 'object', description: 'Weighted final scores' },
    { key: 'winner', type: 'string', description: 'Final winner or draw' },
  ],
}

export const leaderboardUpdateDescriptor: RunnerConfigDescriptor = {
  nodeType: 'leaderboard_update',
  displayName: 'Leaderboard Update',
  category: 'battle',
  fields: [
    {
      key: 'battleId',
      label: 'Battle ID',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'kFactor',
      label: 'K-Factor',
      type: 'number',
      defaultValue: '32',
      min: 1,
      max: 64,
    },
    {
      key: 'leaderboardId',
      label: 'Leaderboard ID',
      type: 'text',
      defaultValue: 'global',
    },
  ],
  outputFields: [
    { key: 'updatedRatings', type: 'object', description: 'New ELO ratings per contender' },
    { key: 'rankChanges', type: 'object', description: 'Rank changes per contender' },
  ],
}
