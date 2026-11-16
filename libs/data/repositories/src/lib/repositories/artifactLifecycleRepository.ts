import { supabase } from '@lenserfight/data/supabase'

export type ArtifactLifecycleType = 'lens' | 'workflow' | 'battle' | 'agent'

/**
 * Ids per fn_artifact_lifecycle_status_batch call. Must not exceed the limit the
 * RPC enforces (see 20270608000004_artifact_lifecycle_status_batch.sql); longer
 * id lists are split across calls.
 */
const LIFECYCLE_STATUS_BATCH_MAX = 200

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
  /**
   * Statuses for many artifacts of one type in a single round-trip, keyed by
   * artifact id. Ids the caller cannot view are absent from the result rather
   * than throwing, so one hidden artifact does not fail a whole list.
   */
  getStatusBatch(
    type: ArtifactLifecycleType,
    ids: string[],
  ): Promise<Record<string, ArtifactLifecycleStatus>>
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

  async getStatusBatch(
    type: ArtifactLifecycleType,
    ids: string[],
  ): Promise<Record<string, ArtifactLifecycleStatus>> {
    if (ids.length === 0) return {}

    // The RPC rejects more than LIFECYCLE_STATUS_BATCH_MAX ids so a single call
    // cannot become unbounded work. Infinite-scroll lists legitimately exceed
    // that, so split here rather than pushing the limit onto every caller.
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += LIFECYCLE_STATUS_BATCH_MAX) {
      chunks.push(ids.slice(i, i + LIFECYCLE_STATUS_BATCH_MAX))
    }

    const results = await Promise.all(
      chunks.map(async (chunk) => {
        const { data, error } = await supabase.rpc('fn_artifact_lifecycle_status_batch', {
          p_artifact_type: type,
          p_artifact_ids: chunk,
        })
        if (error) throw error
        return (data ?? {}) as Record<string, unknown>
      }),
    )

    return Object.fromEntries(
      results.flatMap((raw) =>
        Object.entries(raw).map(
          ([id, status]) => [id, normalizeLifecycleStatus(status)] as const,
        ),
      ),
    )
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
