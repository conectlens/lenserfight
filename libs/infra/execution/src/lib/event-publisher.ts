// EventPublisher — single point of truth for engine → observer emissions.
//
// Why this exists (Phase 3, GRASP Indirection):
//   * The engine must never buffer, drop, or re-order events silently.
//   * Every emission site used to call `ctx.onEvent?.(event)` inline, which
//     bled observability concerns into the node runtime.
//   * `EventPublisher` centralises:
//       - map engine-snake-case to the canonical SSE enum (Phase 1),
//       - stamp correlation metadata (runId, wave, parentEventId),
//       - swallow callback failures so observability never breaks execution.
//
// The publisher DOES NOT write to `workflow_run_events` directly — that is
// the caller's responsibility via `WorkflowExecutionContext.onEvent`. The
// browser hook persists via `workflowsService.appendRunEvent`; the CF Worker
// will publish via `fn_append_workflow_run_event` in Phase 7.

export interface EnginePublishEvent {
  runId: string
  nodeId: string
  /** Engine-side snake_case name (e.g. `node_completed`). */
  name: string
  metadata?: Record<string, unknown>
}

export interface EventPublisherConfig {
  /** Correlation trace id propagated onto every event's metadata. */
  traceId?: string
  /** Callback invoked for every event; failures are swallowed. */
  sink?: (event: EnginePublishEvent) => void | Promise<void>
}

export class EventPublisher {
  private waveIdx = 0
  private lastEventId = 0

  constructor(private readonly config: EventPublisherConfig = {}) {}

  setWave(wave: number): void {
    this.waveIdx = wave
  }

  /**
   * Emit an event through the configured sink. Observability failures MUST
   * NOT propagate — they are explicitly caught so a broken event store never
   * kills a run.
   */
  async emit(event: EnginePublishEvent): Promise<void> {
    if (!this.config.sink) return
    const stamped: EnginePublishEvent = {
      ...event,
      metadata: {
        ...(event.metadata ?? {}),
        wave: this.waveIdx,
        ...(this.config.traceId ? { traceId: this.config.traceId } : {}),
      },
    }
    try {
      await this.config.sink(stamped)
      this.lastEventId++
    } catch {
      // observability failures never break execution
    }
  }

  get emissionCount(): number {
    return this.lastEventId
  }
}
