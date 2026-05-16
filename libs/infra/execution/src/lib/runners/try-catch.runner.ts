import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class TryCatchRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'try_catch'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — wrap downstream execution with error handling
    return {
      output: {
        mediaType: 'text',
        text: 'Try-catch executed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
