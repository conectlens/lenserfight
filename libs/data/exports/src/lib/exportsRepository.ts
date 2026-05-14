import {
  isExportJobDTO,
  type ExportJobDTO,
  type ExportListResponseDTO,
  type ExportRequestDTO,
} from '@lenserfight/api/exports'

/**
 * Port (interface) — Low Coupling + Indirection (GRASP).
 *
 * The orchestrator depends on this port only; the concrete implementation
 * uses Supabase RPCs. Swapping to a different backend (e.g., a REST API)
 * does not touch the orchestrator or the UI.
 */
export interface ExportsRepositoryPort {
  enqueue(req: ExportRequestDTO): Promise<ExportJobDTO>
  status(jobId: string): Promise<ExportJobDTO>
  list(limit: number, cursor?: string | null): Promise<ExportListResponseDTO>
  revoke(jobId: string): Promise<void>
}

/**
 * Minimal Supabase client surface — kept loose so tests can pass mocks
 * without dragging the @supabase/supabase-js types in.
 */
export interface SupabaseLike {
  functions: {
    invoke(
      name: string,
      opts?: { body?: unknown; headers?: Record<string, string> },
    ): Promise<{ data: unknown; error: { message: string } | null }>
  }
  from(table: string): {
    select(cols: string): {
      eq(col: string, val: string): {
        order(col: string, opts: { ascending: boolean }): {
          limit(n: number): Promise<{ data: unknown[] | null; error: { message: string } | null }>
        }
      }
    }
  }
}

/**
 * Supabase-backed implementation (EX-1 sketch). Calls three edge
 * functions: exports-build, exports-status, exports-revoke.
 *
 * Bounds + safety:
 *   - validates the response shape via isExportJobDTO before returning,
 *     so a misbehaving edge function cannot corrupt the UI.
 *   - never logs the request body (may contain entity slugs that are
 *     user data).
 */
export class SupabaseExportsRepository implements ExportsRepositoryPort {
  constructor(private readonly client: SupabaseLike) {}

  async enqueue(req: ExportRequestDTO): Promise<ExportJobDTO> {
    const { data, error } = await this.client.functions.invoke('exports-build', { body: req })
    if (error) throw new Error(`exports-build failed: ${error.message}`)
    if (!isExportJobDTO(data)) throw new Error('exports-build returned a malformed job')
    return data
  }

  async status(jobId: string): Promise<ExportJobDTO> {
    if (!/^[0-9a-f-]{36}$/.test(jobId)) throw new Error('Invalid job id')
    const { data, error } = await this.client.functions.invoke('exports-status', {
      body: { jobId },
    })
    if (error) throw new Error(`exports-status failed: ${error.message}`)
    if (!isExportJobDTO(data)) throw new Error('exports-status returned a malformed job')
    return data
  }

  async list(limit: number, cursor?: string | null): Promise<ExportListResponseDTO> {
    const safeLimit = Math.max(1, Math.min(50, Math.floor(limit)))
    const { data, error } = await this.client.functions.invoke('exports-status', {
      body: { list: true, limit: safeLimit, cursor: cursor ?? null },
    })
    if (error) throw new Error(`exports-status list failed: ${error.message}`)
    if (!data || typeof data !== 'object' || !Array.isArray((data as { items?: unknown }).items)) {
      throw new Error('exports-status list returned a malformed page')
    }
    return data as ExportListResponseDTO
  }

  async revoke(jobId: string): Promise<void> {
    if (!/^[0-9a-f-]{36}$/.test(jobId)) throw new Error('Invalid job id')
    const { error } = await this.client.functions.invoke('exports-revoke', { body: { jobId } })
    if (error) throw new Error(`exports-revoke failed: ${error.message}`)
  }
}
