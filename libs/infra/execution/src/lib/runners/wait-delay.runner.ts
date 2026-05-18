/**
 * WaitDelayRunner — pause workflow execution for a configured duration.
 *
 * GRASP Information Expert: this runner knows how to interpret delay
 * configuration and produce a timed pause in the execution pipeline.
 *
 * Config schema (nodeConfig):
 *   delayMs?: number — milliseconds to wait (default: 0, max: 86_400_000 = 24h)
 *   delayUntil?: string — ISO 8601 timestamp to wait until (takes priority over delayMs)
 *
 * Security:
 * - Maximum delay capped at 24 hours to prevent resource exhaustion.
 * - Respects AbortSignal for cooperative cancellation.
 * - No provider call — zero cost node.
 */

import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

const MAX_DELAY_MS = 86_400_000 // 24 hours

export class WaitDelayRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'wait_delay'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    let delayMs = 0

    const delayUntil = ctx.nodeConfig['delayUntil'] as string | undefined
    if (delayUntil) {
      const target = new Date(delayUntil).getTime()
      if (!Number.isNaN(target)) {
        delayMs = Math.max(0, target - Date.now())
      }
    } else {
      const configured = Number(ctx.nodeConfig['delayMs'] ?? 0)
      delayMs = Number.isFinite(configured) ? Math.max(0, configured) : 0
    }

    // Cap at maximum
    delayMs = Math.min(delayMs, MAX_DELAY_MS)

    if (delayMs > 0) {
      await this.sleep(delayMs, ctx.signal)
    }

    return {
      output: {
        mediaType: 'text',
        text: `Waited ${delayMs}ms`,
        data: { delayMs, completedAt: new Date().toISOString() },
        durationMs: delayMs,
      },
    }
  }

  private sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Wait cancelled', 'AbortError'))
        return
      }

      const timer = setTimeout(resolve, ms)

      signal?.addEventListener('abort', () => {
        clearTimeout(timer)
        reject(new DOMException('Wait cancelled', 'AbortError'))
      }, { once: true })
    })
  }
}
