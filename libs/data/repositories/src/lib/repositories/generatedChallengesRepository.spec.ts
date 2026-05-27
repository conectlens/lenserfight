// Mock supabase client — all mocks must be inside vi.hoisted() because
// vi.mock is hoisted to the top of the file.
const { mockSelect, mockInsert, mockUpdate, mockEq, mockIn, mockMaybeSingle, mockSingle, mockFrom } =
  vi.hoisted(() => ({
    mockSelect: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockEq: vi.fn(),
    mockIn: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockSingle: vi.fn(),
    mockFrom: vi.fn(),
  }))

function setupMockChains() {
  mockSingle.mockResolvedValue({ data: null, error: null })
  mockMaybeSingle.mockResolvedValue({ data: null, error: null })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockInsert.mockReturnValue({ select: mockSelect })
  mockEq.mockImplementation(() => ({
    eq: mockEq,
    in: mockIn,
    maybeSingle: mockMaybeSingle,
  }))
  mockIn.mockReturnValue({ error: null })
  mockUpdate.mockReturnValue({ eq: mockEq })
  mockFrom.mockImplementation(() => ({
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn().mockReturnValue({
      eq: mockEq,
    }),
  }))
}

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  getCachedSession: vi.fn(() => null),
  getCachedAccessToken: vi.fn(() => null),
}))

import { generatedChallengesRepository } from './generatedChallengesRepository'

describe('generatedChallengesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupMockChains()
  })

  describe('create', () => {
    it('inserts a pending challenge record', async () => {
      mockSingle.mockResolvedValue({ data: { id: 'challenge-1' }, error: null })

      const id = await generatedChallengesRepository.create({
        battleId: 'battle-1',
        config: {
          generatorLensId: 'lens-1',
          generatorModelId: 'model-1',
          challengeType: 'math_calculation',
          difficulty: 'hard',
          language: 'en',
        },
        createdBy: 'user-1',
      })

      expect(id).toBe('challenge-1')
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          battle_id: 'battle-1',
          challenge_type: 'math_calculation',
          status: 'pending',
          generator_lens_id: 'lens-1',
          generator_model_id: 'model-1',
          difficulty: 'hard',
          language: 'en',
        }),
      )
    })

    it('throws on insert failure', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { message: 'DB error' } })

      await expect(
        generatedChallengesRepository.create({
          battleId: 'battle-1',
          config: {
            generatorLensId: 'lens-1',
            generatorModelId: 'model-1',
            challengeType: 'grammar_quiz',
          },
        }),
      ).rejects.toThrow('Failed to create generated challenge')
    })
  })

  describe('getForBattle', () => {
    it('returns null when no locked challenge exists', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null })

      const result = await generatedChallengesRepository.getForBattle('battle-1')
      expect(result).toBeNull()
    })

    it('maps database row to GeneratedChallengeRecord', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: {
          id: 'challenge-1',
          battle_id: 'battle-1',
          challenge_type: 'math_calculation',
          status: 'locked',
          generator_lens_id: 'lens-1',
          generator_version_id: null,
          generator_model_id: 'model-1',
          question_text: 'What is 2+2?',
          question_payload: { expected_format: 'number' },
          answer_key_hash: 'abc123',
          difficulty: 'easy',
          language: 'en',
          time_limit_seconds: 300,
          scoring_mode: 'auto_score',
          content_hash: 'hash-xyz',
          execution_run_id: 'run-1',
          input_snapshot: { difficulty: 'easy' },
          locked_at: '2026-05-17T00:00:00Z',
          created_at: '2026-05-17T00:00:00Z',
          created_by: 'user-1',
        },
        error: null,
      })

      const result = await generatedChallengesRepository.getForBattle('battle-1')
      expect(result).toEqual({
        id: 'challenge-1',
        battleId: 'battle-1',
        challengeType: 'math_calculation',
        status: 'locked',
        generatorLensId: 'lens-1',
        generatorVersionId: null,
        generatorModelId: 'model-1',
        questionText: 'What is 2+2?',
        questionPayload: { expected_format: 'number' },
        answerKeyHash: 'abc123',
        difficulty: 'easy',
        language: 'en',
        timeLimitSeconds: 300,
        scoringMode: 'auto_score',
        contentHash: 'hash-xyz',
        executionRunId: 'run-1',
        inputSnapshot: { difficulty: 'easy' },
        lockedAt: '2026-05-17T00:00:00Z',
        createdAt: '2026-05-17T00:00:00Z',
        createdBy: 'user-1',
      })
    })
  })
})
