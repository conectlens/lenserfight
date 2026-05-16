import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class FilterItemsRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'filter_items'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — filter array items based on configured predicates
    return {
      output: {
        mediaType: 'text',
        text: 'Items filtered.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
