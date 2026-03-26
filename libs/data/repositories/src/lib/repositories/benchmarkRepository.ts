import { supabase } from '@lenserfight/data/supabase'
import {
  BenchmarkSuiteRecord,
  BenchmarkTaskRecord,
  InvalidationRecord,
  CreateBenchmarkSuiteInput,
  CreateBenchmarkTaskInput,
  InvalidateResultInput,
} from '@lenserfight/types'

// --- Port ---

export interface BenchmarkRepositoryPort {
  listSuites(creatorLenserId?: string): Promise<BenchmarkSuiteRecord[]>
  getSuite(suiteId: string): Promise<BenchmarkSuiteRecord | null>
  getTasksBySuite(suiteId: string): Promise<BenchmarkTaskRecord[]>
  createSuite(input: CreateBenchmarkSuiteInput, creatorLenserId: string): Promise<BenchmarkSuiteRecord>
  createTask(input: CreateBenchmarkTaskInput): Promise<BenchmarkTaskRecord>
  invalidateResult(input: InvalidateResultInput, invalidatedBy: string): Promise<InvalidationRecord>
}

// --- Supabase Implementation ---

export class SupabaseBenchmarkRepository implements BenchmarkRepositoryPort {
  private handleError(error: unknown) {
    const e = error as { code?: string; message?: string }
    if (!e) return
    if (e.code === 'PGRST116') throw new Error('Benchmark record not found.')
    throw error
  }

  async listSuites(creatorLenserId?: string): Promise<BenchmarkSuiteRecord[]> {
    let query = supabase
      .schema('benchmark')
      .from('suites')
      .select('id, title, description, creator_lenser_id, category, status, version, is_public, created_at, updated_at')
      .order('created_at', { ascending: false })

    if (creatorLenserId) {
      query = query.eq('creator_lenser_id', creatorLenserId)
    } else {
      query = query.eq('is_public', true)
    }

    const { data, error } = await query
    if (error) this.handleError(error)
    return (data ?? []) as BenchmarkSuiteRecord[]
  }

  async getSuite(suiteId: string): Promise<BenchmarkSuiteRecord | null> {
    const { data, error } = await supabase
      .schema('benchmark')
      .from('suites')
      .select('id, title, description, creator_lenser_id, category, status, version, is_public, created_at, updated_at')
      .eq('id', suiteId)
      .maybeSingle()

    if (error) this.handleError(error)
    return data as BenchmarkSuiteRecord | null
  }

  async getTasksBySuite(suiteId: string): Promise<BenchmarkTaskRecord[]> {
    const { data, error } = await supabase
      .schema('benchmark')
      .from('tasks')
      .select('id, suite_id, title, prompt_template, evaluation_protocol, required_repetitions, ordinal, created_at')
      .eq('suite_id', suiteId)
      .order('ordinal', { ascending: true })

    if (error) this.handleError(error)
    return (data ?? []) as BenchmarkTaskRecord[]
  }

  async createSuite(input: CreateBenchmarkSuiteInput, creatorLenserId: string): Promise<BenchmarkSuiteRecord> {
    const { data, error } = await supabase
      .schema('benchmark')
      .from('suites')
      .insert({
        title: input.title,
        description: input.description ?? null,
        category: input.category ?? null,
        version: input.version ?? '1.0.0',
        is_public: input.is_public ?? false,
        creator_lenser_id: creatorLenserId,
        status: 'draft',
      })
      .select('id, title, description, creator_lenser_id, category, status, version, is_public, created_at, updated_at')
      .single()

    if (error) this.handleError(error)
    return data as BenchmarkSuiteRecord
  }

  async createTask(input: CreateBenchmarkTaskInput): Promise<BenchmarkTaskRecord> {
    const { data, error } = await supabase
      .schema('benchmark')
      .from('tasks')
      .insert({
        suite_id: input.suite_id,
        title: input.title,
        prompt_template: input.prompt_template,
        evaluation_protocol: input.evaluation_protocol ?? {},
        required_repetitions: input.required_repetitions ?? 1,
        ordinal: input.ordinal ?? 0,
      })
      .select('id, suite_id, title, prompt_template, evaluation_protocol, required_repetitions, ordinal, created_at')
      .single()

    if (error) this.handleError(error)
    return data as BenchmarkTaskRecord
  }

  async invalidateResult(input: InvalidateResultInput, invalidatedBy: string): Promise<InvalidationRecord> {
    const { data, error } = await supabase
      .schema('benchmark')
      .from('invalidations')
      .insert({
        result_set_id: input.result_set_id,
        reason: input.reason,
        invalidated_by: invalidatedBy,
        invalidated_at: new Date().toISOString(),
      })
      .select('id, result_set_id, reason, invalidated_by, invalidated_at')
      .single()

    if (error) this.handleError(error)
    return data as InvalidationRecord
  }
}
