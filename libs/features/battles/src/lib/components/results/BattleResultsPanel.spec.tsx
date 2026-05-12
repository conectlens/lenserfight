import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { BattleResultsPanel } from './BattleResultsPanel'
import type { Battle, Contender, VoteAggregate } from '../../types/battle.types'
import type { PublicExecutionJobRecord } from '../../hooks/query/useExecutionJobs'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.ComponentPropsWithoutRef<'div'>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@lenserfight/ui/widgets', () => ({
  ScoreBar: ({ scoreA, scoreB }: { scoreA: number; scoreB: number }) => (
    <div data-testid="score-bar">{scoreA} vs {scoreB}</div>
  ),
}))

vi.mock('@lenserfight/ui/components', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../scoring/VotePanel', () => ({
  VotePanel: () => <div data-testid="vote-panel">VotePanel</div>,
}))

vi.mock('../result/BattleResultCTA', () => ({
  BattleResultCTA: () => <div data-testid="battle-result-cta">CTA</div>,
}))

vi.mock('./ExecutionMetadataPanel', () => ({
  ExecutionMetadataPanel: () => <div data-testid="execution-metadata">Metadata</div>,
}))

vi.mock('./ScorecardPanel', () => ({
  ScorecardPanel: () => <div data-testid="scorecard-panel">Scorecard</div>,
}))

function makeBattle(overrides: Partial<Battle> = {}): Battle {
  return {
    id: 'b1',
    slug: 'test',
    title: 'Test',
    task_prompt: 'prompt',
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
    content_type: 'text',
    ...overrides,
  }
}

function makeContender(slot: 'A' | 'B', id: string): Contender {
  return {
    id,
    battle_id: 'b1',
    slot,
    contender_type: 'ai_model',
    display_name: `Contender ${slot}`,
    contender_ref_id: null,
  }
}

function makeAggregate(contenderId: string, votes: number): VoteAggregate {
  return {
    battle_id: 'b1',
    contender_id: contenderId,
    raw_vote_count: votes,
    weighted_vote_sum: votes,
    draw_count: 0,
    rank_position: null,
  }
}

const baseProps = {
  battle: makeBattle(),
  contenders: [makeContender('A', 'c1'), makeContender('B', 'c2')],
  aggregates: [],
  totalVotes: 0,
  executionJobs: [] as PublicExecutionJobRecord[],
  scorecardData: null,
  currentUserId: undefined,
  myVote: null,
  onVote: vi.fn(),
}

describe('BattleResultsPanel', () => {
  it('renders "Results" section label', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="idle" isResult={false} />)
    expect(screen.getByText('Results')).toBeTruthy()
  })

  it('shows "Waiting for submissions" in idle phase', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="idle" isResult={false} />)
    expect(screen.getByText(/Waiting for submissions/i)).toBeTruthy()
  })

  it('shows "AI Scoring" in running phase', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="running" isResult={false} />)
    expect(screen.getByText(/AI Scoring/i)).toBeTruthy()
  })

  it('shows VotePanel in voting phase', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="voting" isResult={false} />)
    expect(screen.getByTestId('vote-panel')).toBeTruthy()
  })

  it('shows "Voting open" badge in voting phase', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="voting" isResult={false} />)
    expect(screen.getByText('Voting open')).toBeTruthy()
  })

  it('shows winner in result phase when A wins', () => {
    const aggregates = [makeAggregate('c1', 10), makeAggregate('c2', 5)]
    render(
      <BattleResultsPanel
        {...baseProps}
        currentPhase="result"
        isResult={true}
        aggregates={aggregates}
        totalVotes={15}
      />
    )
    expect(screen.getByText(/Contender A wins the battle/i)).toBeTruthy()
  })

  it('shows draw when votes are equal', () => {
    const aggregates = [makeAggregate('c1', 5), makeAggregate('c2', 5)]
    render(
      <BattleResultsPanel
        {...baseProps}
        currentPhase="result"
        isResult={true}
        aggregates={aggregates}
        totalVotes={10}
      />
    )
    expect(screen.getByText(/split evenly/i)).toBeTruthy()
  })

  it('shows "Final" badge in result phase', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="result" isResult={true} />)
    expect(screen.getByText('Final')).toBeTruthy()
  })

  it('shows scorecard panel when scorecard data present', () => {
    const scorecardData = {
      scorecards: [{ id: 's1', battle_id: 'b1', contender_id: 'c1', rubric_criterion_id: 'r1', result: 'pass' as const }],
      criteria: [{ id: 'r1', name: 'Quality', weight: 1 }],
    }
    render(
      <BattleResultsPanel
        {...baseProps}
        currentPhase="result"
        isResult={true}
        scorecardData={scorecardData}
      />
    )
    expect(screen.getByTestId('scorecard-panel')).toBeTruthy()
  })

  it('does not show scorecard panel when no scorecard data', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="result" isResult={true} scorecardData={null} />)
    expect(screen.queryByTestId('scorecard-panel')).toBeNull()
  })

  it('shows current vote standings during voting when votes exist', () => {
    const aggregates = [makeAggregate('c1', 3), makeAggregate('c2', 2)]
    render(
      <BattleResultsPanel
        {...baseProps}
        currentPhase="voting"
        isResult={false}
        aggregates={aggregates}
        totalVotes={5}
      />
    )
    expect(screen.getByText(/Current standings/i)).toBeTruthy()
  })

  it('does not show standings during voting when no votes yet', () => {
    render(<BattleResultsPanel {...baseProps} currentPhase="voting" isResult={false} totalVotes={0} />)
    expect(screen.queryByText(/Current standings/i)).toBeNull()
  })

  it('shows forum thread link when forumThreadId present in result phase', () => {
    render(
      <BattleResultsPanel
        {...baseProps}
        currentPhase="result"
        isResult={true}
        battle={makeBattle({ forum_thread_id: 'thread-42' })}
      />
    )
    expect(screen.getByText(/Discuss in forum/i)).toBeTruthy()
  })
})
