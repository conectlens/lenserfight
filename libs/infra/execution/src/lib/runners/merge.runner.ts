import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class MergeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'merge'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — merge multiple upstream branch outputs into one
    return {
      output: {
        mediaType: 'text',
        text: 'Branches merged.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
