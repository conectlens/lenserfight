import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SplitInBatchesRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'split_in_batches'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — split input array into configurable batch sizes
    return {
      output: {
        mediaType: 'text',
        text: 'Split into batches.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
