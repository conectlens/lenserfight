/**
 * EnvelopeHandlerRegistry — dispatches workflow run outputs to registered
 * envelope handlers. See ./types.ts for the design rationale.
 *
 * Usage from the workflow executor:
 *   const dispatch = createDefaultEnvelopeRegistry()
 *   for (const output of finalNodeOutputs) {
 *     await dispatch.dispatch(output, postRunCtx)  // never throws
 *   }
 */

import { BattleCreateHandler } from './battle-create.handler'
import { ScheduleTriggerHandler } from './schedule-trigger.handler'
import type { EnvelopeHandler, EnvelopeHandlerResult, PostRunContext } from './types'

export interface DispatchOutcome {
  readonly handler: string
  readonly status: 'handled' | 'skipped' | 'error'
  readonly result?: EnvelopeHandlerResult
  readonly error?: { message: string }
}

export class EnvelopeHandlerRegistry {
  private readonly handlers: EnvelopeHandler[]

  constructor(handlers: EnvelopeHandler[] = []) {
    this.handlers = [...handlers]
  }

  register(handler: EnvelopeHandler): void {
    this.handlers.push(handler)
  }

  /**
   * Run all matching handlers against `output`. Catches every handler error
   * so a single failure cannot block the run completion path. Returns one
   * outcome per attempted handler.
   */
  async dispatch(output: unknown, ctx: PostRunContext): Promise<DispatchOutcome[]> {
    const outcomes: DispatchOutcome[] = []

    for (const handler of this.handlers) {
      if (!handler.matches(output)) continue

      try {
        const result = await handler.handle(output, ctx)
        outcomes.push({
          handler: handler.name,
          status: result.handled ? 'handled' : 'skipped',
          result,
        })
      } catch (err) {
        outcomes.push({
          handler: handler.name,
          status: 'error',
          error: { message: err instanceof Error ? err.message : String(err) },
        })
      }
    }

    return outcomes
  }

  /** Useful for tests. */
  size(): number {
    return this.handlers.length
  }
}

/**
 * Factory: registry with the two production handlers wired in. Tests should
 * instantiate `EnvelopeHandlerRegistry` directly with stubs.
 */
export function createDefaultEnvelopeRegistry(): EnvelopeHandlerRegistry {
  return new EnvelopeHandlerRegistry([
    new BattleCreateHandler(),
    new ScheduleTriggerHandler(),
  ])
}
