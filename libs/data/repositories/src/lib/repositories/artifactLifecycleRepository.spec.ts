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
})
