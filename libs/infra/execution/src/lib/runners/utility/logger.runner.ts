import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class LoggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'logger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — log workflow data to configured sink
    return {
      output: {
        mediaType: 'text',
        text: 'Logged.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
