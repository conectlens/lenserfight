import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

import { SupabaseArtifactLifecycleRepository } from './artifactLifecycleRepository'

const lifecyclePayload = {
  artifact_type: 'lens',
  artifact_id: 'lens-1',
  state: 'archived',
  visibility: 'private',
  archived_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  pinned: true,
  version_id: 'version-1',
  snapshot_hash: 'abc123',
  dependency_summary: {
    artifact_type: 'lens',
    artifact_id: 'lens-1',
    counts: { battles: 3, executions: 12 },
    total: 15,
    blocking_reasons: ['3 battles', '12 execution requests'],
    has_dependencies: true,
    can_hard_delete: false,
  },
}

describe('SupabaseArtifactLifecycleRepository', () => {
  let repo: SupabaseArtifactLifecycleRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseArtifactLifecycleRepository()
    mockRpc.mockResolvedValue({ data: lifecyclePayload, error: null })
  })

  it('gets lifecycle status through fn_artifact_lifecycle_status', async () => {
    const result = await repo.getStatus('lens', 'lens-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_artifact_lifecycle_status', {
      p_artifact_type: 'lens',
      p_artifact_id: 'lens-1',
    })
    expect(result.state).toBe('archived')
    expect(result.dependency_summary.total).toBe(15)
  })

  it('gets dependency summaries through fn_artifact_dependency_summary', async () => {
    mockRpc.mockResolvedValueOnce({
      data: lifecyclePayload.dependency_summary,
      error: null,
    })

    const result = await repo.getDependencySummary('workflow', 'workflow-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_artifact_dependency_summary', {
      p_artifact_type: 'workflow',
      p_artifact_id: 'workflow-1',
    })
    expect(result.blocking_reasons).toEqual(['3 battles', '12 execution requests'])
  })

  it('archives through fn_artifact_archive', async () => {
    await repo.archive('battle', 'battle-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_artifact_archive', {
      p_artifact_type: 'battle',
      p_artifact_id: 'battle-1',
    })
  })

  it('restores through fn_artifact_restore', async () => {
    await repo.restore('agent', 'agent-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_artifact_restore', {
      p_artifact_type: 'agent',
      p_artifact_id: 'agent-1',
    })
  })

  it('deletes through dependency-aware fn_artifact_delete', async () => {
    await repo.delete('lens', 'lens-1')

    expect(mockRpc).toHaveBeenCalledWith('fn_artifact_delete', {
      p_artifact_type: 'lens',
      p_artifact_id: 'lens-1',
    })
  })

  it('pins and unpins through saved reactions', async () => {
    await repo.pin('workflow', 'workflow-1')
    await repo.unpin('workflow', 'workflow-1')

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'fn_artifact_pin', {
      p_artifact_type: 'workflow',
      p_artifact_id: 'workflow-1',
      p_pin: true,
    })
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'fn_artifact_pin', {
      p_artifact_type: 'workflow',
      p_artifact_id: 'workflow-1',
      p_pin: false,
    })
  })

  it('rethrows rpc errors', async () => {
    mockRpc.mockResolvedValueOnce({ data: null, error: new Error('blocked') })

    await expect(repo.getStatus('lens', 'lens-1')).rejects.toThrow('blocked')
  })

  describe('getStatusBatch', () => {
    it('fetches many statuses in a single call, keyed by artifact id', async () => {
      mockRpc.mockResolvedValueOnce({
        data: {
          'workflow-1': { ...lifecyclePayload, artifact_id: 'workflow-1' },
          'workflow-2': { ...lifecyclePayload, artifact_id: 'workflow-2' },
        },
        error: null,
      })

      const result = await repo.getStatusBatch('workflow', ['workflow-1', 'workflow-2'])

      expect(mockRpc).toHaveBeenCalledTimes(1)
      expect(mockRpc).toHaveBeenCalledWith('fn_artifact_lifecycle_status_batch', {
        p_artifact_type: 'workflow',
        p_artifact_ids: ['workflow-1', 'workflow-2'],
      })
      expect(Object.keys(result)).toEqual(['workflow-1', 'workflow-2'])
      expect(result['workflow-1']?.artifact_id).toBe('workflow-1')
      // Normalized the same way the single-artifact path is.
      expect(result['workflow-2']?.dependency_summary.total).toBe(15)
    })

    it('makes no request for an empty id list', async () => {
      await expect(repo.getStatusBatch('workflow', [])).resolves.toEqual({})

      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('omits ids the caller cannot view rather than failing the batch', async () => {
      mockRpc.mockResolvedValueOnce({
        data: { 'workflow-1': { ...lifecyclePayload, artifact_id: 'workflow-1' } },
        error: null,
      })

      const result = await repo.getStatusBatch('workflow', ['workflow-1', 'workflow-hidden'])

      expect(result['workflow-1']).toBeDefined()
      expect(result['workflow-hidden']).toBeUndefined()
    })

    it('splits id lists that exceed the rpc limit and merges the responses', async () => {
      // 201 ids — one past the 200 the RPC accepts, so this must become 2 calls.
      const ids = Array.from({ length: 201 }, (_, i) => `workflow-${i}`)
      mockRpc.mockImplementation((_name: string, args: { p_artifact_ids: string[] }) =>
        Promise.resolve({
          data: Object.fromEntries(
            args.p_artifact_ids.map((id) => [id, { ...lifecyclePayload, artifact_id: id }]),
          ),
          error: null,
        }),
      )

      const result = await repo.getStatusBatch('workflow', ids)

      expect(mockRpc).toHaveBeenCalledTimes(2)
      expect(mockRpc.mock.calls[0][1].p_artifact_ids).toHaveLength(200)
      expect(mockRpc.mock.calls[1][1].p_artifact_ids).toHaveLength(1)
      // Every id survives the merge.
      expect(Object.keys(result)).toHaveLength(201)
      expect(result['workflow-200']?.artifact_id).toBe('workflow-200')
    })

    it('rethrows when any chunk fails', async () => {
      mockRpc.mockResolvedValueOnce({ data: null, error: new Error('blocked') })

      await expect(repo.getStatusBatch('workflow', ['workflow-1'])).rejects.toThrow('blocked')
    })
  })
})
