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
      tooltip: {
        summary: 'The prompt template that defines the challenge all contenders must respond to.',
        whenRequired: 'Always required — the battle needs a shared prompt for fair comparison.',
        format: 'UUID of a published prompt template.',
      },
    },
    {
      key: 'contenderLensIds',
      label: 'Contender Lens IDs',
      type: 'string_array',
      required: true,
      hint: 'Add Lens UUIDs for each contender.',
      tooltip: {
        summary: 'The lenses that will compete in this battle. Each lens runs the prompt template independently.',
        format: 'Array of UUID lens IDs. Minimum 2 contenders required.',
        commonMistakes: 'Adding the same lens ID twice, which creates a battle against itself.',
      },
    },
    {
      key: 'title',
      label: 'Battle Title',
      type: 'text',
      tooltip: {
        summary: 'A human-readable title for the battle, displayed in the feed and battle detail page.',
        format: 'Free-form text. Auto-generated from the prompt template if left empty.',
      },
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
      tooltip: {
        summary: 'Controls who can see and vote on this battle.',
        executionImpact: 'Public battles appear in the feed and are discoverable. Private battles are only visible to participants. Unlisted battles are accessible via direct link.',
      },
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
      tooltip: {
        summary: 'How the battle winner is determined. AI Judge uses an AI lens, Community Vote uses user votes, Hybrid combines both.',
        executionImpact: 'AI Judge is instant but costs tokens. Community Vote requires waiting for votes. Hybrid uses weighted scores from both.',
      },
    },
    {
      key: 'maxRounds',
      label: 'Max Rounds',
      type: 'number',
      defaultValue: '3',
      min: 1,
      max: 10,
      tooltip: {
        summary: 'Maximum number of rounds in the battle. Each round re-executes all contenders with the same or varied prompts.',
        format: 'Integer between 1 and 10.',
        executionImpact: 'Each round multiplies the AI execution cost by the number of contenders.',
      },
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
      tooltip: {
        summary: 'Who pays for the AI model inference costs of this battle.',
        executionImpact: 'Platform funding uses shared credits. User BYOK uses the creator\'s own API keys and is not rate-limited by platform quotas.',
      },
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
      tooltip: {
        summary: 'Maximum time allowed for all contenders to complete their execution.',
        format: 'Integer in milliseconds. 60000 = 1 minute.',
        executionImpact: 'If any contender exceeds this timeout, it is terminated and marked as timed out. The battle continues with available results.',
      },
    },
    {
      key: 'parallel',
      label: 'Run Contenders in Parallel',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether contenders execute simultaneously or one after another.',
        executionImpact: 'Parallel is faster (wall-clock time equals slowest contender). Sequential is slower but uses fewer concurrent resources.',
      },
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
      tooltip: {
        summary: 'The lens this contender uses to generate its response.',
        whenRequired: 'Always required — identifies which AI lens competes in this slot.',
        format: 'UUID lens ID.',
      },
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
      tooltip: {
        summary: 'Which side of the battle this contender occupies (A or B).',
        whenRequired: 'Always required — determines how scores and votes are attributed.',
      },
    },
    {
      key: 'maxTokens',
      label: 'Max Tokens',
      type: 'number',
      tooltip: {
        summary: 'Maximum output tokens for this contender. Uses the lens default if not set.',
        format: 'Positive integer. Leave empty for model/lens default.',
        executionImpact: 'Limits the contender response length. Shorter limits are cheaper but may truncate complex answers.',
      },
    },
    {
      key: 'temperature',
      label: 'Temperature',
      type: 'number',
      min: 0,
      max: 2,
      step: 0.1,
      tooltip: {
        summary: 'Controls randomness for this contender. Overrides the lens default if set.',
        format: 'Decimal between 0 and 2.',
        executionImpact: 'Lower values produce more deterministic outputs. For fair battles, consider using the same temperature for both contenders.',
      },
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
      tooltip: {
        summary: 'The AI lens used as the judge to evaluate contender outputs.',
        whenRequired: 'Always required — the judge lens contains the evaluation logic.',
        format: 'UUID lens ID of a lens configured for judging.',
      },
    },
    {
      key: 'rubric',
      label: 'Judging Rubric',
      type: 'textarea',
      required: true,
      rows: 4,
      tooltip: {
        summary: 'Detailed criteria the judge uses to score contender outputs.',
        format: 'Free-form text. Include specific evaluation dimensions (creativity, accuracy, relevance) and their relative importance.',
        commonMistakes: 'Writing vague rubrics that produce inconsistent results. Be specific about what constitutes high and low scores.',
        executionImpact: 'Injected into the judge prompt. More detailed rubrics increase token usage but produce more reliable scoring.',
      },
    },
    {
      key: 'scoringScale',
      label: 'Scoring Scale',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 100,
      tooltip: {
        summary: 'The maximum score the judge can assign to each contender.',
        format: 'Integer between 1 and 100.',
        commonMistakes: 'Using a 100-point scale without fine-grained rubric criteria, causing scores to cluster.',
      },
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
      tooltip: {
        summary: 'How to resolve a tie when contenders receive equal scores.',
        executionImpact: 'Higher Creativity re-evaluates on creativity. Random picks randomly. No Tie forces the judge to re-score until a winner emerges.',
      },
    },
    {
      key: 'confidenceThreshold',
      label: 'Confidence Threshold',
      type: 'number',
      defaultValue: '0.7',
      min: 0,
      max: 1,
      step: 0.05,
      tooltip: {
        summary: 'Minimum confidence level the judge must have in its verdict for the result to be accepted.',
        format: 'Decimal between 0 and 1.',
        executionImpact: 'Below this threshold, the battle may be flagged for manual review or re-judged.',
      },
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
      tooltip: {
        summary: 'The battle to collect votes for. Typically wired from the upstream battle_create node.',
        format: 'UUID battle ID. Usually {{n1.battleId}} from an upstream Battle Create node.',
      },
    },
    {
      key: 'durationMs',
      label: 'Voting Duration (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 60000,
      max: 604800000,
      hint: 'Max 7 days.',
      tooltip: {
        summary: 'How long the voting window stays open for community votes.',
        format: 'Integer in milliseconds. 86400000 = 24 hours.',
        executionImpact: 'The workflow pauses at this node until the voting window closes or quorum is reached (depending on closing strategy).',
      },
    },
    {
      key: 'minVotes',
      label: 'Minimum Votes',
      type: 'number',
      defaultValue: '10',
      min: 1,
      max: 1000,
      tooltip: {
        summary: 'Minimum number of votes required for the result to be considered valid (quorum).',
        format: 'Integer between 1 and 1000.',
        commonMistakes: 'Setting too high for a new or low-traffic battle, causing it to never close under quorum_only strategy.',
      },
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
      tooltip: {
        summary: 'When the voting window closes. Time or Quorum closes on whichever condition is met first.',
        executionImpact: 'Time Only ignores vote count. Quorum Only waits indefinitely until minVotes is reached. Time or Quorum is the safest default.',
      },
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
      type: 'key_value',
      required: true,
      placeholder: 'Source name',
      hint: 'Score source → weight (e.g. judge: 0.6, community: 0.4). Values must sum to 1.0.',
      tooltip: {
        summary: 'How much each scoring source (AI judge, community votes) contributes to the final score.',
        format: 'Key-value pairs where keys are score source names and values are decimal weights summing to 1.0.',
        commonMistakes: 'Weights that do not sum to 1.0, which skews the final scores. Using source names that do not match upstream node outputs.',
      },
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
      tooltip: {
        summary: 'How to resolve ties in the weighted final scores.',
        executionImpact: 'Judge Preferred uses the AI judge score as tiebreaker. Community Preferred uses vote count. Draw declares no winner.',
      },
    },
    {
      key: 'minimumMargin',
      label: 'Minimum Margin',
      type: 'number',
      defaultValue: '0.05',
      min: 0,
      max: 1,
      step: 0.01,
      tooltip: {
        summary: 'The minimum score difference required to declare a winner. Below this margin, the result is a draw.',
        format: 'Decimal between 0 and 1. 0.05 = 5% margin.',
        executionImpact: 'Higher margins make draws more common. Setting to 0 means any difference declares a winner.',
      },
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
      tooltip: {
        summary: 'The completed battle whose result should be applied to the leaderboard.',
        format: 'UUID battle ID. Usually wired from an upstream battle node.',
      },
    },
    {
      key: 'kFactor',
      label: 'K-Factor',
      type: 'number',
      defaultValue: '32',
      min: 1,
      max: 64,
      tooltip: {
        summary: 'The ELO K-factor controlling how much a single battle result affects ratings.',
        format: 'Integer between 1 and 64. Default 32 is standard for new players.',
        executionImpact: 'Higher K-factor means bigger rating swings per battle. Lower values stabilize ratings but require more battles to converge.',
      },
    },
    {
      key: 'leaderboardId',
      label: 'Leaderboard ID',
      type: 'text',
      defaultValue: 'global',
      tooltip: {
        summary: 'Which leaderboard to update with the battle results.',
        format: 'Leaderboard identifier string. "global" is the default public leaderboard.',
      },
    },
  ],
  outputFields: [
    { key: 'updatedRatings', type: 'object', description: 'New ELO ratings per contender' },
    { key: 'rankChanges', type: 'object', description: 'Rank changes per contender' },
  ],
}
