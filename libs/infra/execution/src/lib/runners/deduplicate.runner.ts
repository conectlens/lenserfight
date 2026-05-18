import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class DeduplicateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'deduplicate'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — remove duplicate items based on configured key
    return {
      output: {
        mediaType: 'text',
        text: 'Items deduplicated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
