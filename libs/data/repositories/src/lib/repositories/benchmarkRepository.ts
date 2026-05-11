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
    const { data, error } = await supabase.rpc('fn_list_benchmark_suites', {
      p_creator_lenser_id: creatorLenserId ?? null,
      p_limit: 100,
      p_cursor: null,
    })

    if (error) this.handleError(error)
    return (data ?? []) as BenchmarkSuiteRecord[]
  }

  async getSuite(suiteId: string): Promise<BenchmarkSuiteRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_benchmark_suite', {
      p_suite_id: suiteId,
    })

    if (error) this.handleError(error)
    return (data?.[0] ?? null) as BenchmarkSuiteRecord | null
  }

  async getTasksBySuite(suiteId: string): Promise<BenchmarkTaskRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_benchmark_tasks', {
      p_suite_id: suiteId,
    })

    if (error) this.handleError(error)
    return (data ?? []) as BenchmarkTaskRecord[]
  }

  async createSuite(input: CreateBenchmarkSuiteInput, _creatorLenserId: string): Promise<BenchmarkSuiteRecord> {
    const { data: suiteId, error } = await supabase.rpc('fn_create_benchmark_suite', {
      p_title: input.title,
      p_description: input.description ?? null,
      p_category: input.category ?? null,
      p_is_public: input.is_public ?? false,
    })

    if (error) this.handleError(error)
    if (!suiteId) throw new Error('Failed to create benchmark suite')

    const suite = await this.getSuite(suiteId as string)
    if (!suite) throw new Error('Failed to retrieve created benchmark suite')
    return suite
  }

  async createTask(input: CreateBenchmarkTaskInput): Promise<BenchmarkTaskRecord> {
    const { data: taskId, error } = await supabase.rpc('fn_create_benchmark_task', {
      p_suite_id: input.suite_id,
      p_title: input.title,
      p_prompt_template: input.prompt_template,
      p_evaluation_protocol: input.evaluation_protocol ?? {},
      p_required_repetitions: input.required_repetitions ?? 1,
      p_ordinal: input.ordinal ?? 0,
    })

    if (error) this.handleError(error)
    if (!taskId) throw new Error('Failed to create benchmark task')

    const tasks = await this.getTasksBySuite(input.suite_id)
    const task = tasks.find((t) => t.id === taskId)
    if (!task) throw new Error('Failed to retrieve created benchmark task')
    return task
  }

  async invalidateResult(input: InvalidateResultInput, _invalidatedBy: string): Promise<InvalidationRecord> {
    const { data: invalidationId, error } = await supabase.rpc('fn_create_benchmark_invalidation', {
      p_result_set_id: input.result_set_id,
      p_reason: input.reason,
    })

    if (error) this.handleError(error)
    if (!invalidationId) throw new Error('Failed to create benchmark invalidation')

    return {
      id: invalidationId as string,
      result_set_id: input.result_set_id,
      reason: input.reason,
      invalidated_by: _invalidatedBy,
      invalidated_at: new Date().toISOString(),
    } as InvalidationRecord
  }
}
