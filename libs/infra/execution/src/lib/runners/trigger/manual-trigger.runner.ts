import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ManualTriggerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'manual_trigger'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — pass through manual trigger inputs to downstream nodes
    return {
      output: {
        mediaType: 'text',
        text: 'Manual trigger activated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
