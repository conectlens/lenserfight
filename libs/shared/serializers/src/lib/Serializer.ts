import type {
  ExportEnvelope,
  ExportFormat,
  ExportKind,
  ValidationResult,
} from '@lenserfight/domain/exports'

/**
 * Serializer — Polymorphism (GRASP).
 *
 * Adding a new format means implementing this interface and registering
 * the instance with the registry — no switch ladder, no orchestrator
 * change.
 *
 * Isomorphic contract: implementations MUST NOT use DOM-only APIs
 * (document, window) or Node-only APIs (fs, path). The same module is
 * imported by the browser, the CLI (Node), and supabase edge functions
 * (Deno).
 */
export interface SerializerContext {
  /** Whether the caller has owner scope (for format-specific notes). */
  visibility: ExportEnvelope<unknown>['visibility']
  /** Optional locale override for human-readable strings. */
  locale?: string
}

export interface Serializer<TData = unknown> {
  readonly format: ExportFormat
  readonly kind: ExportKind
  readonly mediaType: string
  readonly extension: string
  serialize(envelope: ExportEnvelope<TData>, ctx: SerializerContext): Promise<string>
  validate(output: string): Promise<ValidationResult>
}
