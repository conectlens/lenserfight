import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class RetryRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'retry'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — retry upstream node execution with backoff strategy
    return {
      output: {
        mediaType: 'text',
        text: 'Retry logic executed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
