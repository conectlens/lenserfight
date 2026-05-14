import {
  canonicalize,
  type ExportEnvelope,
  type ExportFormat,
  type ExportKind,
  type ValidationResult,
} from '@lenserfight/domain/exports'

import type { Serializer } from '../Serializer'

/**
 * JSON serializer. Reuses the canonical-JSON algorithm from the domain
 * layer so checksums verified by the edge function match exactly what
 * a localhost client wrote.
 *
 * Format guarantees: stable key order, UTF-8 NFC, integers preserved,
 * no NaN / Infinity (rejected by canonicalize).
 */
export class JsonSerializer<T = unknown> implements Serializer<T> {
  readonly format: ExportFormat = 'json'
  readonly mediaType = 'application/json'
  readonly extension = 'json'
  constructor(readonly kind: ExportKind) {}

  async serialize(envelope: ExportEnvelope<T>): Promise<string> {
    return canonicalize(envelope)
  }

  async validate(output: string): Promise<ValidationResult> {
    try {
      const parsed = JSON.parse(output)
      // Round-trip must equal the canonical form we produced.
      const round = canonicalize(parsed)
      const ok = round === output
      return {
        ok,
        issues: ok ? [] : [{ path: '/', message: 'JSON did not round-trip canonical form' }],
      }
    } catch (err) {
      return {
        ok: false,
        issues: [{ path: '/', message: `JSON parse failed: ${(err as Error).message}` }],
      }
    }
  }
}
