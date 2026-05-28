import { contentModerationService } from './contentModerationService'
import { ModerationError } from './moderation.types'

/**
 * Shape the workflow execution engine expects. Duplicated here (rather than
 * imported from @lenserfight/infra/execution) to avoid a cyclic dependency
 * between the moderation and execution libs. Keep in sync with
 * `libs/infra/execution/src/lib/execution.types.ts`.
 */
export type ModerationPhase = 'input' | 'output'

export interface ModerationDecision {
  allowed: boolean
  policy?: string
  reason?: string
  metadata?: Record<string, unknown>
}

export interface WorkflowModerationGateway {
  check(phase: ModerationPhase, text: string, nodeId: string): Promise<ModerationDecision>
}

export interface WorkflowModerationGatewayOptions {
  /**
   * When true, errors from the underlying ContentModerationService are
   * treated as fail-open (`allowed: true`). Default: false (fail-closed so
   * an unreachable semantic policy cannot silently leak content).
   */
  failOpen?: boolean
}

/**
 * Bridges ContentModerationService to the WorkflowExecutionService contract.
 * Unlike the raw service, the gateway never throws — it returns a decision
 * so the engine can record `moderation_flagged` events and mark the node
 * failed with a structured payload.
 */
export function createWorkflowModerationGateway(
  options: WorkflowModerationGatewayOptions = {},
): WorkflowModerationGateway {
  const { failOpen = false } = options
  return {
    async check(phase, text) {
      if (!text || text.trim().length === 0) {
        return { allowed: true }
      }
      try {
        await contentModerationService.validate(text)
        return { allowed: true }
      } catch (err) {
        if (err instanceof ModerationError) {
          return {
            allowed: false,
            policy: 'content_moderation',
            reason: err.message,
            metadata: { phase, reasons: err.reasons },
          }
        }
        if (failOpen) return { allowed: true, policy: 'error' }
        return {
          allowed: false,
          policy: 'error',
          reason: err instanceof Error ? err.message : 'moderation_error',
        }
      }
    },
  }
}
