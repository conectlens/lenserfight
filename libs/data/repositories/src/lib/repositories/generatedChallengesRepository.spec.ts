import { generatedChallengesRepository } from './generatedChallengesRepository'

// Mock supabase client
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
      update: mockUpdate.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockReturnValue({ error: null }),
          in: mockIn.mockReturnValue({ error: null }),
        }),
      }),
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          eq: mockEq.mockReturnValue({
            maybeSingle: mockMaybeSingle,
          }),
          maybeSingle: mockMaybeSingle,
        }),
      }),
    })),
  },
}))

describe('generatedChallengesRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
