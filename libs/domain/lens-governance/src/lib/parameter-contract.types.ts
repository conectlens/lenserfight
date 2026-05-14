import type {
  DEPENDENCY_BINDINGS,
  LENS_KINDS,
  PARAMETER_CLASSIFICATIONS,
  PARAMETER_KINDS,
  PARAMETER_SCOPES,
} from './constants'

export type ParameterClassification = (typeof PARAMETER_CLASSIFICATIONS)[number]
export type ParameterKind = (typeof PARAMETER_KINDS)[number]
export type ParameterScope = (typeof PARAMETER_SCOPES)[number]
export type DependencyBinding = (typeof DEPENDENCY_BINDINGS)[number]
export type LensKind = (typeof LENS_KINDS)[number]

/**
 * Primitive parameter types — directly typed values supplied by callers.
 */
export type ParameterPrimitiveType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object'

/**
 * AI-specific parameter types — values that carry semantic load for prompt
 * composition, retrieval, or agent orchestration.
 */
export type ParameterAiType =
  | 'prompt'
  | 'context'
  | 'research'
  | 'citation'
  | 'memory'
  | 'conversation'
  | 'embeddings'
  | 'agent-output'

/**
 * Runtime-injected parameter types — never supplied by external callers.
 */
export type ParameterRuntimeType =
  | 'secret'
  | 'api-key'
  | 'execution-context'
  | 'workflow-state'
  | 'system-variable'

export type ParameterType =
  | ParameterPrimitiveType
  | ParameterAiType
  | ParameterRuntimeType

export type ParameterDefaultKind =
  | 'static'
  | 'computed'
  | 'environment'
  | 'late_bound'

export interface ParameterDefaultSpec {
  kind: ParameterDefaultKind
  /** Literal value for `static`; expression string for `computed`; resolver path for `environment`/`late_bound`. */
  value?: unknown
  expression?: string
  source?: string
}

export interface ParameterValidationRules {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  enum?: ReadonlyArray<string | number>
  mimeTypes?: ReadonlyArray<string>
  urlScheme?: ReadonlyArray<string>
}

export interface ParameterDeprecation {
  since_version: string
  replaced_by?: { content_hash: string; label?: string }
  migration_recipe?: Record<string, unknown>
  removal_planned_at?: string
}

/**
 * The canonical frozen rule for a single parameter on a published Contract.
 * Mirrors `lenses.parameter_contracts` row shape.
 */
export interface ParameterContract {
  label: string
  tool_id: string | null
  classification: ParameterClassification
  kind: ParameterKind
  type: ParameterType
  required: boolean
  default?: ParameterDefaultSpec | null
  validation?: ParameterValidationRules | null
  scope: ParameterScope
  overrideable_by: ReadonlyArray<string>
  deprecation?: ParameterDeprecation | null
}
