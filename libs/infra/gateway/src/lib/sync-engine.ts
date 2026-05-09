import type {
  ObjectClassName,
  SignedEnvelope,
  SyncEntry,
  SyncStatus,
} from '@lenserfight/types'

import {
  isCloudAuthoritative,
  isLocalOnly,
  pullableObjectClasses,
} from './object-classes'

export interface SyncEnginePort {
  pushOutbox(envelope: SignedEnvelope<{ entries: SyncEntry[] }>): Promise<{
    appliedCount: number
    rejectedCount: number
    rejections: unknown
  }>
  pull(input: {
    envelope: SignedEnvelope<unknown>
    objectClasses: ObjectClassName[]
    limit?: number
  }): Promise<unknown[]>
  status(deviceId: string): Promise<SyncStatus[]>
}

export interface SyncEngineOptions {
  /** Maximum entries per push batch. */
  batchSize?: number
}

/**
 * Coordinates outbox flush and pull loops on top of the data layer.
 *
 * Responsibilities:
 *   - Validate object class authority before queueing.
 *   - Batch entries up to `batchSize` (default 100).
 *   - Surface per-class status to the CLI / web UI.
 *
 * The engine is transport-agnostic: it accepts a `SyncEnginePort` (typically
 * the `gatewaySyncRepository` from `@lenserfight/data/repositories`) and
 * leaves transport details (HTTP, signing, retries) to the daemon.
 */
export class SyncEngine {
  private pending: SyncEntry[] = []
  private readonly batchSize: number

  constructor(
    private readonly port: SyncEnginePort,
    options: SyncEngineOptions = {}
  ) {
    this.batchSize = options.batchSize ?? 100
  }

  /**
   * Validate and enqueue a single sync entry. Returns the queued entry, or
   * `null` if it was rejected for class-authority reasons.
   */
  enqueue(entry: SyncEntry): SyncEntry | null {
    if (isCloudAuthoritative(entry.object_class)) return null
    if (isLocalOnly(entry.object_class)) return null
    this.pending.push(entry)
    return entry
  }

  pendingCount(): number {
    return this.pending.length
  }

  /**
   * Build a batch envelope from pending entries (caller is responsible for
   * signing). Returns the entries to include in the next push.
   */
  takeBatch(): SyncEntry[] {
    const batch = this.pending.splice(0, this.batchSize)
    return batch
  }

  /**
   * Flush the next batch via the configured port. Returns the server's reply.
   */
  async flush(envelope: SignedEnvelope<{ entries: SyncEntry[] }>): Promise<{
    appliedCount: number
    rejectedCount: number
    rejections: unknown
  }> {
    return this.port.pushOutbox(envelope)
  }

  /**
   * One-shot pull across all pullable classes (cloud-authoritative +
   * conflict-aware), bounded by `limit`.
   */
  async pullAll(input: {
    envelope: SignedEnvelope<unknown>
    limit?: number
  }): Promise<unknown[]> {
    return this.port.pull({
      envelope: input.envelope,
      objectClasses: pullableObjectClasses(),
      limit: input.limit,
    })
  }

  async status(deviceId: string): Promise<SyncStatus[]> {
    return this.port.status(deviceId)
  }
}
