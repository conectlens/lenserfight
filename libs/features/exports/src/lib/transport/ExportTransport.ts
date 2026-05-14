import type { ExportEnvelope, ExportRequest } from '@lenserfight/domain/exports'

import type { RuntimeMode } from '../runtime/detectRuntime'

/**
 * ExportTransport — Polymorphism + Low Coupling (GRASP).
 *
 * Orchestrator depends only on this interface. Concrete transports plug
 * in via the TransportRegistry below; adding a new destination (e.g.,
 * S3, git-commit) never touches the orchestrator or UI.
 */

export type TransportId = 'cloud-download' | 'local-download' | 'local-workspace'

export interface TransportCapabilities {
  /** True when this transport can run in the given runtime. */
  availableIn: RuntimeMode[]
  /** Human-readable destination label, shown in the DestinationSelector. */
  label: string
  /** Description for the help tooltip. */
  description: string
}

export interface DeliveredArtifact {
  filename: string
  bytes: number
  sha256: string
  /** Where it landed — URL (cloud download) or workspace path (local). */
  location: string
}

export interface ExportResult {
  transport: TransportId
  artifacts: DeliveredArtifact[]
}

export interface ExportTransport {
  readonly id: TransportId
  capabilities(): TransportCapabilities
  deliver(
    payloads: { envelope: ExportEnvelope<unknown>; serialized: string; filename: string }[],
    req: ExportRequest,
  ): Promise<ExportResult>
}

export class TransportRegistry {
  private readonly map = new Map<TransportId, ExportTransport>()

  register(transport: ExportTransport): void {
    this.map.set(transport.id, transport)
  }

  list(): ExportTransport[] {
    return Array.from(this.map.values())
  }

  availableFor(mode: RuntimeMode): ExportTransport[] {
    return this.list().filter((t) => t.capabilities().availableIn.includes(mode))
  }

  resolve(id: TransportId): ExportTransport {
    const t = this.map.get(id)
    if (!t) throw new Error(`TransportRegistry: unknown transport "${id}"`)
    return t
  }
}
