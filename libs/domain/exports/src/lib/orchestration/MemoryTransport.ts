import { sha256OfString } from '../checksum'
import type { ExportEnvelope, ExportRequest } from '../types'

import type {
  DeliveredArtifact,
  ExportResult,
  ExportTransport,
  TransportCapabilities,
} from './ExportTransport'

export interface CapturedExport {
  envelope: ExportEnvelope<unknown>
  serialized: string
  filename: string
}

/**
 * MemoryTransport — Pure Fabrication (GRASP).
 *
 * Captures serialized export output in-process instead of performing a
 * DOM download or filesystem write. Non-web callers (the CLI, the MCP
 * server) need the raw bytes themselves rather than a side-effecting
 * "save" — the CLI writes `.captured[0].serialized` to `--out`/stdout,
 * the MCP server returns it directly in a tool response. No Node or DOM
 * APIs, so it stays isomorphic like the rest of this package.
 */
export class MemoryTransport implements ExportTransport {
  readonly id = 'local-workspace' as const
  readonly captured: CapturedExport[] = []

  capabilities(): TransportCapabilities {
    return {
      availableIn: ['cloud', 'localhost-browser', 'localhost-desktop'],
      label: 'In-memory capture',
      description: 'Captures the serialized export in memory; the caller delivers it itself.',
    }
  }

  async deliver(
    payloads: CapturedExport[],
    _req: ExportRequest,
  ): Promise<ExportResult> {
    const artifacts: DeliveredArtifact[] = []
    for (const payload of payloads) {
      this.captured.push(payload)
      const sha256 = await sha256OfString(payload.serialized)
      artifacts.push({
        filename: payload.filename,
        bytes: new TextEncoder().encode(payload.serialized).byteLength,
        sha256,
        location: 'memory',
      })
    }
    return { transport: this.id, artifacts }
  }
}
