import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class StopReturnRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'stop_return'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — halt workflow execution and return final output
    return {
      output: {
        mediaType: 'text',
        text: 'Workflow stopped with return value.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
