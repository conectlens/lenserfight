import type { NamespaceClass, ValidationVerdict } from './namespace-class'

/**
 * Result of identity_gov.fn_validate_handle / public.fn_check_handle.
 * Returned verbatim from the Supabase RPC — field names match column names.
 */
export interface HandleValidationResult {
  verdict:      ValidationVerdict
  class_hit:    NamespaceClass | null
  risk_score:   number
  reason_codes: string[]
  is_available: boolean
}

/**
 * A single row from identity_gov.reserved_namespaces.
 * Used by admin tooling and the AI Intel worker.
 */
export interface ReservedNamespace {
  id:          string
  entry_kind:  import('./namespace-class').EntryKind
  value:       string
  class:       Exclude<NamespaceClass, 'public'>
  deny_score:  number
  reason:      string | null
  source:      import('./namespace-class').EntrySource
  expires_at:  string | null
  created_at:  string
}
