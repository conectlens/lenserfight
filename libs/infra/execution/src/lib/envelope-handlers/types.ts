/**
 * Envelope-handler types — Phase CT composition root.
 *
 * Several node runners (BattleCreateRunner, ScheduleTriggerRunner) deliberately
 * avoid calling Supabase RPCs that require the caller's JWT. They instead emit
 * "intent envelopes" (`__battle_create_request`, `__schedule_trigger_request`)
 * that this module dispatches AFTER the workflow run completes.
 *
 * GRASP: Pure Fabrication. The registry decouples runners from the executor
 * and from Supabase auth concerns.
 *
 * Security: the executor populates `PostRunContext.userJwt` ONLY when the
 * workflow's funding source is `workflow_internal`. Handlers that need user
 * auth must throw if `userJwt` is missing — they MUST NOT silently downgrade
 * to a service-role call.
 */

export interface PostRunContext {
  /** Workflow run row id (`lenses.workflow_runs.id`). */
  readonly workflowRunId: string
  /** Workflow id (`lenses.workflows.id`). */
  readonly workflowId: string
  /** Owner lenser id resolved from `lenses.workflow_runs.triggered_by`. */
  readonly lenserId: string
  /**
   * Authenticated user JWT. Present ONLY when the run is invoked from an
   * interactive context with `fundingSource === 'workflow_internal'`. Handlers
   * that require user auth must validate presence and throw when absent.
   */
  readonly userJwt?: string
  /** Supabase project URL (server env). */
  readonly supabaseUrl: string
  /** Supabase anon key (used with the user JWT for PostgREST calls). */
  readonly supabaseAnonKey: string
  /** Supabase service-role key (for service-side INSERT/UPDATE on owner-protected tables). */
  readonly supabaseServiceRoleKey: string
}

export interface EnvelopeHandlerResult {
  /** Stable identifier used in logs and `workflow_battle_run_log.phase`. */
  readonly handler: string
  /** Whether the envelope was handled. False is also a valid outcome. */
  readonly handled: boolean
  /** Payload describing the side-effect (e.g. created battle id, schedule id). */
  readonly data?: Record<string, unknown>
}

export interface EnvelopeHandler {
  /** Stable identifier used for logging and metrics. */
  readonly name: string
  /** Cheap predicate: must not throw and must not perform IO. */
  matches(output: unknown): boolean
  /** Side-effecting work. Throws on hard failure; the registry catches and logs. */
  handle(output: unknown, ctx: PostRunContext): Promise<EnvelopeHandlerResult>
}
