import { describe, expect, it, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({ mockRpc: vi.fn() }))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: { rpc: mockRpc },
}))

vi.mock('../factory', () => ({
  createExecutionRepository: vi.fn(() => ({})),
}))

import { SupabaseExecutionRepository } from './executionRepository'

const LENS_ID = 'lens-uuid-1'
const RUN_ID = 'run-uuid-1'
const ARTIFACT_ID = 'artifact-uuid-1'

const rawRun = {
  id: RUN_ID,
  request_id: 'req-1',
  status: 'completed',
  model_id: 'claude-3',
  provider_request_id: 'pr-1',
  execution_hash: null,
  input_hash: null,
  output_hash: null,
  started_at: '2026-01-01T00:00:00Z',
  completed_at: '2026-01-01T00:00:10Z',
  latency_ms: 10000,
  cost_estimate: 0.01,
  token_input: 100,
  token_output: 50,
  credit_cost: 5,
  billing_status: 'charged',
  error_code: null,
  error_message: null,
  created_at: '2026-01-01T00:00:00Z',
}

const expectedRun = {
  id: RUN_ID,
  requestId: 'req-1',
  status: 'completed',
  modelId: 'claude-3',
  providerRequestId: 'pr-1',
  executionHash: null,
  inputHash: null,
  outputHash: null,
  startedAt: '2026-01-01T00:00:00Z',
  completedAt: '2026-01-01T00:00:10Z',
  latencyMs: 10000,
  costEstimate: 0.01,
  tokenInput: 100,
  tokenOutput: 50,
  creditCost: 5,
  billingStatus: 'charged',
  errorCode: null,
  errorMessage: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const rawArtifact = {
  id: ARTIFACT_ID,
  run_id: RUN_ID,
  artifact_kind: 'text',
  content_text: 'hello world',
  content_json: null,
  visibility: 'public',
  is_primary_output: true,
  media_object_id: null,
  resource_id: null,
  output_type: 'text',
  created_at: '2026-01-01T00:00:00Z',
}

const expectedArtifact = {
  id: ARTIFACT_ID,
  runId: RUN_ID,
  artifactKind: 'text',
  contentText: 'hello world',
  contentJson: null,
  visibility: 'public',
  isPrimaryOutput: true,
  mediaObjectId: null,
  resourceId: null,
  outputType: 'text',
  createdAt: '2026-01-01T00:00:00Z',
}

describe('SupabaseExecutionRepository', () => {
  let repo: SupabaseExecutionRepository

  beforeEach(() => {
    repo = new SupabaseExecutionRepository()
    vi.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  // ---------------------------------------------------------------------------
  // getHistoryForLens
  // ---------------------------------------------------------------------------
  describe('getHistoryForLens', () => {
    it('calls fn_get_lens_execution_history with default limit 20 and offset 0', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getHistoryForLens(LENS_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_execution_history', {
        p_lens_id: LENS_ID,
        p_limit: 20,
        p_offset: 0,
      })
    })

    it('enforces limit and supports pagination via offset', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await repo.getHistoryForLens(LENS_ID, 50, 20)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_lens_execution_history', {
        p_lens_id: LENS_ID,
        p_limit: 50,
        p_offset: 20,
      })
    })

    it('maps raw rows to LensExecutionHistoryItem shape', async () => {
      const rawRow = {
        request_id: 'req-1', lens_id: LENS_ID, version_id: null, version_number: null,
        model_id: 'm-1', model_key: 'claude', provider_key: 'anthropic', funding_source: 'paid',
        run_id: RUN_ID, run_status: 'completed', latency_ms: 500, token_input: 100,
        token_output: 50, credit_cost: 10, created_at: '2026-01-01T00:00:00Z',
      }
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const [item] = await repo.getHistoryForLens(LENS_ID)
      expect(item.requestId).toBe('req-1')
      expect(item.modelKey).toBe('claude')
      expect(item.fundingSource).toBe('paid')
    })

    it('returns empty array when no history', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getHistoryForLens(LENS_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('history error') })
      await expect(repo.getHistoryForLens(LENS_ID)).rejects.toThrow('history error')
    })
  })

  // ---------------------------------------------------------------------------
  // getExecutionHistoryForPrompt (deprecated — delegates to getHistoryForLens)
  // ---------------------------------------------------------------------------
  describe('getExecutionHistoryForPrompt', () => {
    it('calls fn_get_lens_execution_history and maps to PromptExecutionRecord shape', async () => {
      const rawRow = {
        request_id: 'req-1', lens_id: LENS_ID, version_id: null, version_number: null,
        model_id: null, model_key: null, provider_key: null, funding_source: 'free',
        run_id: RUN_ID, run_status: 'completed', latency_ms: null, token_input: null,
        token_output: null, credit_cost: null, created_at: '2026-01-01T00:00:00Z',
      }
      mockRpc.mockResolvedValue({ data: [rawRow], error: null })
      const [record] = await repo.getExecutionHistoryForPrompt(LENS_ID)
      expect(record.id).toBe('req-1')
      expect(record.lensId).toBe(LENS_ID)
      expect(record.runId).toBe(RUN_ID)
      expect(record.artifacts).toEqual([])
    })

    it('returns empty array when no history', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getExecutionHistoryForPrompt(LENS_ID)).toEqual([])
    })
  })

  // ---------------------------------------------------------------------------
  // getRunById
  // ---------------------------------------------------------------------------
  describe('getRunById', () => {
    it('calls fn_get_run_details with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawRun], error: null })
      const result = await repo.getRunById(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_run_details', { p_run_id: RUN_ID })
      expect(result).toEqual(expectedRun)
    })

    it('maps all nullable fields to null when absent', async () => {
      const minimalRun = { id: RUN_ID, request_id: 'req-1', status: 'pending', created_at: '2026-01-01T00:00:00Z' }
      mockRpc.mockResolvedValue({ data: [minimalRun], error: null })
      const result = await repo.getRunById(RUN_ID)
      expect(result?.modelId).toBeNull()
      expect(result?.billingStatus).toBe('free')
      expect(result?.latencyMs).toBeNull()
    })

    it('returns null when run not found', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getRunById(RUN_ID)).toBeNull()
    })

    it('returns null when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      expect(await repo.getRunById(RUN_ID)).toBeNull()
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('run error') })
      await expect(repo.getRunById(RUN_ID)).rejects.toThrow('run error')
    })
  })

  // ---------------------------------------------------------------------------
  // getArtifactsForRun
  // ---------------------------------------------------------------------------
  describe('getArtifactsForRun', () => {
    it('calls fn_get_execution_artifacts with p_run_id', async () => {
      mockRpc.mockResolvedValue({ data: [rawArtifact], error: null })
      const result = await repo.getArtifactsForRun(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_execution_artifacts', { p_run_id: RUN_ID })
      expect(result).toEqual([expectedArtifact])
    })

    it('maps all nullable artifact fields to defaults', async () => {
      const minimalArtifact = { id: ARTIFACT_ID, run_id: RUN_ID, artifact_kind: 'text', created_at: '2026-01-01T00:00:00Z' }
      mockRpc.mockResolvedValue({ data: [minimalArtifact], error: null })
      const [artifact] = await repo.getArtifactsForRun(RUN_ID)
      expect(artifact.contentText).toBeNull()
      expect(artifact.visibility).toBe('private')
      expect(artifact.isPrimaryOutput).toBe(false)
    })

    it('returns empty array when no artifacts', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      expect(await repo.getArtifactsForRun(RUN_ID)).toEqual([])
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('artifacts error') })
      await expect(repo.getArtifactsForRun(RUN_ID)).rejects.toThrow('artifacts error')
    })
  })

  // ---------------------------------------------------------------------------
  // pollRunStatus
  // ---------------------------------------------------------------------------
  describe('pollRunStatus', () => {
    it('calls fn_get_run_details and returns only status fields', async () => {
      mockRpc.mockResolvedValue({ data: [rawRun], error: null })
      const result = await repo.pollRunStatus(RUN_ID)
      expect(mockRpc).toHaveBeenCalledWith('fn_get_run_details', { p_run_id: RUN_ID })
      expect(result).toEqual({
        id: RUN_ID,
        status: 'completed',
        completedAt: '2026-01-01T00:00:10Z',
        errorCode: null,
      })
    })

    it('throws "Run not found" when no row returned', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null })
      await expect(repo.pollRunStatus(RUN_ID)).rejects.toThrow(`Run ${RUN_ID} not found`)
    })

    it('throws "Run not found" when data is empty array', async () => {
      mockRpc.mockResolvedValue({ data: [], error: null })
      await expect(repo.pollRunStatus(RUN_ID)).rejects.toThrow(`Run ${RUN_ID} not found`)
    })

    it('rethrows Supabase errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('poll error') })
      await expect(repo.pollRunStatus(RUN_ID)).rejects.toThrow('poll error')
    })
  })

  // ---------------------------------------------------------------------------
  // setArtifactVisibility
  // ---------------------------------------------------------------------------
  describe('setArtifactVisibility', () => {
    it('calls fn_set_artifact_visibility with p_artifact_id and p_visibility', async () => {
      await repo.setArtifactVisibility({ artifactId: ARTIFACT_ID, visibility: 'public' })
      expect(mockRpc).toHaveBeenCalledWith('fn_set_artifact_visibility', {
        p_artifact_id: ARTIFACT_ID,
        p_visibility: 'public',
      })
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('visibility error') })
      await expect(repo.setArtifactVisibility({ artifactId: ARTIFACT_ID, visibility: 'private' })).rejects.toThrow('visibility error')
    })
  })

  // ---------------------------------------------------------------------------
  // persistLocalExecution
  // ---------------------------------------------------------------------------
  describe('persistLocalExecution', () => {
    it('calls fn_persist_local_execution with all fields and returns run id', async () => {
      mockRpc.mockResolvedValue({ data: RUN_ID, error: null })
      const result = await repo.persistLocalExecution({
        lensId: LENS_ID,
        versionId: 'v-1',
        provider: 'anthropic',
        model: 'claude-3',
        contentText: 'output text',
        tokenInput: 100,
        tokenOutput: 50,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_persist_local_execution', {
        p_lens_id: LENS_ID,
        p_version_id: 'v-1',
        p_provider: 'anthropic',
        p_model: 'claude-3',
        p_content_text: 'output text',
        p_token_input: 100,
        p_token_output: 50,
      })
      expect(result).toBe(RUN_ID)
    })

    it('passes null for version_id when not provided', async () => {
      mockRpc.mockResolvedValue({ data: RUN_ID, error: null })
      await repo.persistLocalExecution({
        lensId: LENS_ID,
        provider: 'anthropic',
        model: 'claude-3',
        contentText: 'text',
        tokenInput: 0,
        tokenOutput: 0,
      })
      expect(mockRpc).toHaveBeenCalledWith('fn_persist_local_execution', expect.objectContaining({ p_version_id: null }))
    })

    it('rethrows errors', async () => {
      mockRpc.mockResolvedValue({ data: null, error: new Error('persist error') })
      await expect(repo.persistLocalExecution({
        lensId: LENS_ID,
        provider: 'anthropic',
        model: 'claude-3',
        contentText: 'text',
        tokenInput: 0,
        tokenOutput: 0,
      })).rejects.toThrow('persist error')
    })
  })
})
