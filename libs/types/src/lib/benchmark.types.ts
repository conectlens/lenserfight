export type BenchmarkSuiteStatus = 'draft' | 'active' | 'archived'
export type SignificanceTestType =
  | 'wilcoxon'
  | 'ttest_paired'
  | 'ttest_independent'
  | 'bootstrap'
  | 'effect_size_cohens_d'
  | 'krippendorffs_alpha'
  | 'cohens_kappa'

export interface BenchmarkSuiteRecord {
  id: string
  title: string
  description: string | null
  creator_lenser_id: string
  category: string | null
  status: BenchmarkSuiteStatus
  version: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export interface BenchmarkTaskRecord {
  id: string
  suite_id: string
  title: string
  prompt_template: string
  evaluation_protocol: Record<string, unknown>
  required_repetitions: number
  ordinal: number
  created_at: string
}

export interface ProtocolVersionRecord {
  id: string
  suite_id: string
  version: string
  rules_json: Record<string, unknown>
  frozen_at: string
  frozen_by: string
}

export interface ResultSetRecord {
  id: string
  suite_id: string
  task_id: string
  battle_id: string
  protocol_version_id: string
  created_at: string
}

export interface InvalidationRecord {
  id: string
  result_set_id: string
  reason: string
  invalidated_by: string
  invalidated_at: string
}

export interface SignificanceTestRecord {
  id: string
  result_set_id: string
  test_type: SignificanceTestType
  contender_a_id: string | null
  contender_b_id: string | null
  p_value: number | null
  effect_size: number | null
  confidence_lower: number | null
  confidence_upper: number | null
  is_significant: boolean | null
  sample_size: number | null
  computed_at: string
}

export interface CreateBenchmarkSuiteInput {
  title: string
  description?: string
  category?: string
  version?: string
  is_public?: boolean
}

export interface CreateBenchmarkTaskInput {
  suite_id: string
  title: string
  prompt_template: string
  evaluation_protocol?: Record<string, unknown>
  required_repetitions?: number
  ordinal?: number
}

export interface InvalidateResultInput {
  result_set_id: string
  reason: string
}
