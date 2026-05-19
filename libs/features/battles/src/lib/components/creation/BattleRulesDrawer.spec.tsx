import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetBootstrap } = vi.hoisted(() => ({
  mockGetBootstrap: vi.fn(),
}))

vi.mock('@lenserfight/data/repositories', () => ({
  workflowsRepository: {
    getBootstrap: mockGetBootstrap,
  },
}))

// ── Stub heavy UI deps ─────────────────────────────────────────────────────────

vi.mock('@lenserfight/ui/overlays', () => ({
  Drawer: ({
    open,
    children,
    title,
  }: {
    open: boolean
    children: React.ReactNode
    title: string
  }) =>
    open ? (
      <div data-testid="drawer">
        <p>{title}</p>
        {children}
      </div>
    ) : null,
}))

vi.mock('@lenserfight/ui/components', () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}))

vi.mock('../display/BattleStatusBadge', () => ({
  BattleStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status-badge">{status}</span>
  ),
}))

import { BattleRulesDrawer } from './BattleRulesDrawer'
import type { Battle, Contender } from '../../types/battle.types'
import type { LensContextDetail } from '../../types/battle-layout.types'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
}

function renderDrawer(
  battleOverrides: Partial<Battle> = {},
  props: Partial<{
    contenders: Contender[]
    lensDetails: Record<string, LensContextDetail | null>
  }> = {}
) {
  const qc = makeQueryClient()
  const battle: Battle = {
    id: 'b-1',
    slug: 'test-battle',
    title: 'Test Battle',
    task_prompt: 'Write about AI',
    status: 'open',
    total_vote_count: 5,
    published_at: null,
    voting_opens_at: null,
    voting_closes_at: null,
    battle_type: 'ai_vs_ai',
    voter_eligibility: 'open',
    handicap_config: {},
    creator_lenser_id: 'u-1',
    forum_thread_id: null,
    workflow_id: null,
    lens_id: null,
    execution_starts_at: null,
    auto_publish: true,
    voting_duration_hours: 24,
    vote_velocity: 0,
    og_image_url: null,
    ...battleOverrides,
  }

  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <BattleRulesDrawer
          open={true}
          onClose={vi.fn()}
          battle={battle}
          contenders={props.contenders}
          lensDetails={props.lensDetails}
        />
      </MemoryRouter>
    </QueryClientProvider>
  )

  return { battle }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BattleRulesDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetBootstrap.mockResolvedValue(null)
  })

  describe('core display', () => {
    it('renders the drawer title', () => {
      renderDrawer()
      expect(screen.queryByText('Battle Rules')).not.toBeNull()
    })

    it('shows status badge', () => {
      renderDrawer({ status: 'voting' })
      expect(screen.getByTestId('status-badge').textContent).toBe('voting')
    })

    it('shows task prompt', () => {
      renderDrawer({ task_prompt: 'Explain quantum entanglement' })
      expect(screen.queryByText('Explain quantum entanglement')).not.toBeNull()
    })

    it('shows voter eligibility label for human_only', () => {
      renderDrawer({ voter_eligibility: 'human_only' })
      expect(screen.queryByText('Humans only')).not.toBeNull()
    })

    it('shows voter eligibility label for open', () => {
      renderDrawer({ voter_eligibility: 'open' })
      expect(screen.queryByText('Open — anyone can vote')).not.toBeNull()
    })

    it('hides drawer when open=false', () => {
      const qc = makeQueryClient()
      const battle: Battle = {
        id: 'b-2',
        slug: 's',
        title: 'T',
        task_prompt: 'P',
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
        auto_publish: true,
        voting_duration_hours: 24,
        vote_velocity: 0,
        og_image_url: null,
      }
      render(
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <BattleRulesDrawer open={false} onClose={vi.fn()} battle={battle} />
          </MemoryRouter>
        </QueryClientProvider>
      )
      expect(screen.queryByTestId('drawer')).toBeNull()
    })
  })

  describe('V2 battle axes', () => {
    it('shows V2 task source, contender structure, judging mode', () => {
      renderDrawer({
        task_source: 'lens',
        contender_structure: 'ai_vs_ai',
        judging_mode: 'community_vote',
      })
      expect(screen.queryByText('Lens Task')).not.toBeNull()
      expect(screen.queryByText('AI vs AI')).not.toBeNull()
      expect(screen.queryByText('Community Vote')).not.toBeNull()
    })

    it('shows workflow task source label', () => {
      renderDrawer({
        task_source: 'workflow',
        contender_structure: 'ai_vs_ai',
        judging_mode: 'community_vote',
        battle_type: 'workflow_battle',
        workflow_id: 'wf-1',
      })
      expect(screen.queryByText('Workflow Task')).not.toBeNull()
    })

    it('shows challenge task source label', () => {
      renderDrawer({
        task_source: 'challenge',
        contender_structure: 'human_vs_human',
        judging_mode: 'auto_score',
        challenge_type: 'math_calculation',
      })
      expect(screen.queryByText('Challenge Task')).not.toBeNull()
      expect(screen.queryByText('Human vs Human')).not.toBeNull()
      // 'Auto-score' appears in both BattleRulesSection (judging_mode) and ChallengeSection scoring options
      expect(screen.queryAllByText('Auto-score').length).toBeGreaterThan(0)
    })

    it('falls back to legacy battle_type label when no V2 fields', () => {
      renderDrawer({
        battle_type: 'human_vs_human_ai_votes',
        task_source: null,
        contender_structure: null,
        judging_mode: null,
      })
      expect(screen.queryByText('Human vs Human · AI Judge')).not.toBeNull()
    })

    it('falls back to legacy workflow_battle label', () => {
      renderDrawer({
        battle_type: 'workflow_battle',
        task_source: null,
        contender_structure: null,
        judging_mode: null,
        workflow_id: 'wf-fallback',
      })
      expect(screen.queryByText('Workflow Battle')).not.toBeNull()
    })
  })

  describe('workflow section', () => {
    it('fetches and renders workflow card when task_source=workflow', async () => {
      mockGetBootstrap.mockResolvedValue({
        workflow: {
          id: 'wf-1',
          title: 'Summarization Pipeline',
          description: 'Three-step summarization workflow',
          lenser_id: 'u-1',
          visibility: 'public',
          battle_count: 2,
          node_count: 3,
          created_at: '',
          updated_at: '',
        },
        nodes: [],
        edges: [],
      })

      renderDrawer({
        task_source: 'workflow',
        battle_type: 'workflow_battle',
        workflow_id: 'wf-1',
      })

      await waitFor(() => expect(screen.queryByText('Summarization Pipeline')).not.toBeNull())
      expect(screen.queryByText('Three-step summarization workflow')).not.toBeNull()
      expect(screen.queryByText('3 nodes')).not.toBeNull()
      expect(screen.queryByText('View Workflow')).not.toBeNull()
    })

    it('renders workflow nodes in ordinal order', async () => {
      mockGetBootstrap.mockResolvedValue({
        workflow: {
          id: 'wf-1',
          title: 'Pipeline',
          lenser_id: 'u-1',
          visibility: 'public',
          battle_count: 0,
          created_at: '',
          updated_at: '',
        },
        nodes: [
          {
            id: 'n-2',
            workflow_id: 'wf-1',
            lens_id: null,
            ordinal: 2,
            position_x: 0,
            position_y: 0,
            label: 'Second Step',
            created_at: '',
          },
          {
            id: 'n-1',
            workflow_id: 'wf-1',
            lens_id: null,
            ordinal: 1,
            position_x: 0,
            position_y: 0,
            label: 'First Step',
            created_at: '',
          },
        ],
        edges: [],
      })

      renderDrawer({ task_source: 'workflow', battle_type: 'workflow_battle', workflow_id: 'wf-1' })

      await waitFor(() => expect(screen.queryByText('First Step')).not.toBeNull())
      expect(screen.queryByText('Second Step')).not.toBeNull()

      // Verify ordinal ordering: First Step node badge should show "1", Second "2"
      const badges = screen.getAllByText(/^[12]$/)
      expect(badges[0].textContent).toBe('1')
      expect(badges[1].textContent).toBe('2')
    })

    it('shows workflow link with correct href', async () => {
      mockGetBootstrap.mockResolvedValue({
        workflow: {
          id: 'wf-42',
          title: 'My Workflow',
          lenser_id: 'u-1',
          visibility: 'public',
          battle_count: 0,
          created_at: '',
          updated_at: '',
        },
        nodes: [],
        edges: [],
      })

      renderDrawer({
        task_source: 'workflow',
        battle_type: 'workflow_battle',
        workflow_id: 'wf-42',
      })

      await waitFor(() => expect(screen.queryByText('View Workflow')).not.toBeNull())
      const link = screen.getByRole('link', { name: /view workflow/i })
      expect(link.getAttribute('href')).toBe('/workflows/wf-42')
    })

    it('falls back to badge when bootstrap returns null', async () => {
      mockGetBootstrap.mockResolvedValue(null)
      renderDrawer({
        task_source: 'workflow',
        battle_type: 'workflow_battle',
        workflow_id: 'wf-missing',
      })
      await waitFor(() => expect(screen.queryByText(/Workflow linked/i)).not.toBeNull())
    })
  })

  describe('lens section', () => {
    it('shows per-contender lens details', () => {
      const contenders: Contender[] = [
        {
          id: 'c-1',
          battle_id: 'b-1',
          slot: 'A',
          contender_type: 'ai_agent',
          display_name: 'ModelA',
          contender_ref_id: null,
        },
        {
          id: 'c-2',
          battle_id: 'b-1',
          slot: 'B',
          contender_type: 'ai_agent',
          display_name: 'ModelB',
          contender_ref_id: null,
        },
      ]
      const lensDetails: Record<string, LensContextDetail | null> = {
        'c-1': { lensTitle: 'Summarizer', versionNumber: 3, paramCount: 2 },
        'c-2': { lensTitle: 'Analyzer', versionNumber: null, paramCount: 0 },
      }

      renderDrawer(
        { task_source: 'lens', lens_id: 'l-1', battle_type: 'ai_vs_ai' },
        { contenders, lensDetails }
      )

      expect(screen.queryByText('Summarizer')).not.toBeNull()
      expect(screen.queryByText('Analyzer')).not.toBeNull()
      expect(screen.queryByText('v3')).not.toBeNull()
    })

    it('shows shared parameters when present', () => {
      renderDrawer({
        task_source: 'lens',
        lens_id: 'l-1',
        battle_type: 'ai_vs_ai',
        shared_input_snapshot: { topic: 'Machine Learning', language: 'en' },
      })

      expect(screen.queryByText('Shared Parameters')).not.toBeNull()
      expect(screen.queryByText('topic')).not.toBeNull()
      expect(screen.queryByText('Machine Learning')).not.toBeNull()
    })

    it('does not show shared parameters section when snapshot is empty', () => {
      renderDrawer({
        task_source: 'lens',
        lens_id: 'l-1',
        battle_type: 'ai_vs_ai',
        shared_input_snapshot: {},
      })
      expect(screen.queryByText('Shared Parameters')).toBeNull()
    })
  })

  describe('challenge section', () => {
    it('shows challenge type label and description', () => {
      renderDrawer({
        task_source: 'challenge',
        challenge_type: 'math_calculation',
        contender_structure: 'human_vs_human',
        judging_mode: 'auto_score',
      })

      expect(screen.queryByText('Math Challenge')).not.toBeNull()
      expect(screen.queryByText(/Solve math problems/)).not.toBeNull()
    })

    it('shows time limit for writing_contest (15m)', () => {
      renderDrawer({
        task_source: 'challenge',
        challenge_type: 'writing_contest',
        contender_structure: 'human_vs_human',
        judging_mode: 'community_vote',
      })

      expect(screen.queryByText('Writing Contest')).not.toBeNull()
      // writing_contest timeLimitDefault = 900s = 15m
      expect(screen.queryByText('15m')).not.toBeNull()
    })

    it('shows unimplemented warning for hand_drawing', () => {
      renderDrawer({
        task_source: 'challenge',
        challenge_type: 'hand_drawing',
        contender_structure: 'human_vs_human',
        judging_mode: 'community_vote',
      })

      expect(screen.queryByText(/not yet available/i)).not.toBeNull()
    })

    it('shows raw id as badge for unknown challenge type', () => {
      renderDrawer({
        task_source: 'challenge',
        challenge_type: 'unknown_future_type',
        contender_structure: 'human_vs_human',
        judging_mode: 'community_vote',
      })

      expect(screen.queryByText('unknown_future_type')).not.toBeNull()
    })
  })

  describe('handicap section', () => {
    it('shows handicap details for AI battles', () => {
      renderDrawer({
        battle_type: 'ai_vs_ai',
        contender_structure: 'ai_vs_ai',
        handicap_config: {
          injected_delay_ms: 2000,
          time_budget_ms: 300000,
          max_context_tokens: 8192,
        },
      })

      expect(screen.queryByText(/AI Handicap/i)).not.toBeNull()
      expect(screen.queryByText('2000ms')).not.toBeNull()
      expect(screen.queryByText('300s')).not.toBeNull()
      expect(screen.queryByText('8,192 tokens')).not.toBeNull()
    })

    it('hides handicap section when config is empty', () => {
      renderDrawer({
        battle_type: 'ai_vs_ai',
        contender_structure: 'ai_vs_ai',
        handicap_config: {},
      })
      expect(screen.queryByText(/AI Handicap/i)).toBeNull()
    })
  })

  describe('lenser battle policy section', () => {
    it('shows memory mode and instruction disclosure', () => {
      renderDrawer({
        battle_type: 'lenser_battle',
        lenser_battle_policy: {
          memory_mode: 'clean_room',
          instruction_disclosure: 'visible_after_close',
          model_binding_override: false,
        },
      })

      expect(screen.queryByText(/Lenser Battle Policy/i)).not.toBeNull()
      expect(screen.queryByText('Clean Room')).not.toBeNull()
      expect(screen.queryByText('Visible after close')).not.toBeNull()
    })

    it('does not render policy section when lenser_battle_policy is null', () => {
      renderDrawer({ battle_type: 'ai_vs_ai', lenser_battle_policy: null })
      expect(screen.queryByText(/Lenser Battle Policy/i)).toBeNull()
    })
  })

  describe('timing section', () => {
    it('shows voting open/close times when present', () => {
      renderDrawer({
        voting_opens_at: '2026-06-01T12:00:00Z',
        voting_closes_at: '2026-06-03T12:00:00Z',
      })
      expect(screen.queryByText(/Voting opens/i)).not.toBeNull()
      expect(screen.queryByText(/Voting closes/i)).not.toBeNull()
    })

    it('hides timing section when no dates set', () => {
      renderDrawer({ voting_opens_at: null, voting_closes_at: null })
      expect(screen.queryByText(/Voting opens/i)).toBeNull()
    })
  })
})
