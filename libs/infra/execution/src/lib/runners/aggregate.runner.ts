import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class AggregateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'aggregate'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — aggregate items (sum, count, avg, min, max, concat)
    return {
      output: {
        mediaType: 'text',
        text: 'Data aggregated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
