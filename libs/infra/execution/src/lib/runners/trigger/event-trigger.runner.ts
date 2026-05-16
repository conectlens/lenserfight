import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class EventTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'event_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — listen for and forward platform events
    return {
      output: {
        mediaType: 'text',
        text: 'Event trigger activated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
