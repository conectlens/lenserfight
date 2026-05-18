import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SortRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'sort'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — sort items by configured field and direction
    return {
      output: {
        mediaType: 'text',
        text: 'Items sorted.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
