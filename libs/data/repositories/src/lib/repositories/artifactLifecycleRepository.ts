import { supabase } from '@lenserfight/data/supabase'

export type ArtifactLifecycleType = 'lens' | 'workflow' | 'battle' | 'agent'

export interface ArtifactDependencySummary {
  artifact_type: string
  artifact_id: string
  counts: Record<string, number>
  total: number
  blocking_reasons: string[]
  has_dependencies: boolean
  can_hard_delete: boolean
}

export interface ArtifactLifecycleStatus {
  artifact_type: ArtifactLifecycleType
  artifact_id: string
  state: string
  visibility: string | null
  archived_at: string | null
  deleted_at: string | null
  pinned: boolean
  version_id: string | null
  snapshot_hash: string | null
  dependency_summary: ArtifactDependencySummary
  delete_mode?: 'hard_delete' | 'tombstone'
}

export interface ArtifactLifecycleRepositoryPort {
  getStatus(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
  getDependencySummary(type: ArtifactLifecycleType, id: string): Promise<ArtifactDependencySummary>
  archive(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
  restore(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
  delete(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
  pin(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
  unpin(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus>
}

function normalizeDependencySummary(raw: any): ArtifactDependencySummary {
  return {
    artifact_type: String(raw?.artifact_type ?? ''),
    artifact_id: String(raw?.artifact_id ?? ''),
    counts: (raw?.counts ?? {}) as Record<string, number>,
    total: Number(raw?.total ?? 0),
    blocking_reasons: Array.isArray(raw?.blocking_reasons) ? raw.blocking_reasons.map(String) : [],
    has_dependencies: Boolean(raw?.has_dependencies),
    can_hard_delete: Boolean(raw?.can_hard_delete),
  }
}

function normalizeLifecycleStatus(raw: any): ArtifactLifecycleStatus {
  return {
    artifact_type: raw?.artifact_type as ArtifactLifecycleType,
    artifact_id: String(raw?.artifact_id ?? ''),
    state: String(raw?.state ?? 'unknown'),
    visibility: raw?.visibility ?? null,
    archived_at: raw?.archived_at ?? null,
    deleted_at: raw?.deleted_at ?? null,
    pinned: Boolean(raw?.pinned),
    version_id: raw?.version_id ?? null,
    snapshot_hash: raw?.snapshot_hash ?? null,
    dependency_summary: normalizeDependencySummary(raw?.dependency_summary),
    delete_mode: raw?.delete_mode,
  }
}

async function callLifecycleStatus(
  rpcName: string,
  payload: Record<string, unknown>,
): Promise<ArtifactLifecycleStatus> {
  const { data, error } = await supabase.rpc(rpcName, payload)
  if (error) throw error
  return normalizeLifecycleStatus(data)
}

export class SupabaseArtifactLifecycleRepository implements ArtifactLifecycleRepositoryPort {
  async getStatus(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_lifecycle_status', {
      p_artifact_type: type,
      p_artifact_id: id,
    })
  }

  async getDependencySummary(type: ArtifactLifecycleType, id: string): Promise<ArtifactDependencySummary> {
    const { data, error } = await supabase.rpc('fn_artifact_dependency_summary', {
      p_artifact_type: type,
      p_artifact_id: id,
    })
    if (error) throw error
    return normalizeDependencySummary(data)
  }

  async archive(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_archive', {
      p_artifact_type: type,
      p_artifact_id: id,
    })
  }

  async restore(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_restore', {
      p_artifact_type: type,
      p_artifact_id: id,
    })
  }

  async delete(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_delete', {
      p_artifact_type: type,
      p_artifact_id: id,
    })
  }

  async pin(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_pin', {
      p_artifact_type: type,
      p_artifact_id: id,
      p_pin: true,
    })
  }

  async unpin(type: ArtifactLifecycleType, id: string): Promise<ArtifactLifecycleStatus> {
    return callLifecycleStatus('fn_artifact_pin', {
      p_artifact_type: type,
      p_artifact_id: id,
      p_pin: false,
    })
  }
}

export const artifactLifecycleRepository = new SupabaseArtifactLifecycleRepository()
