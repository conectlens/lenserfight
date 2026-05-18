import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class EventTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'event_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // The platform event dispatcher injects __event__ into rootInputs before
    // execution. Surface it as the trigger output so downstream nodes receive
    // the full event payload. Fall back to a typed stub when running manually.
    const eventPayload =
      ctx.resolvedParams['__event__'] !== undefined
        ? ctx.resolvedParams['__event__']
        : {
            type: (ctx.nodeConfig['eventType'] as string | undefined) ?? 'unknown',
            data: {},
            timestamp: new Date().toISOString(),
          }

    return {
      output: {
        mediaType: 'json',
        data: { event: eventPayload },
        durationMs: 0,
      },
    }
  }
}
