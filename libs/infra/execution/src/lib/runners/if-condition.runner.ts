import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class IfConditionRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'if_condition'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — evaluate condition and route to true/false branch
    return {
      output: {
        mediaType: 'text',
        text: 'Condition evaluated.',
        data: { nodeId: ctx.nodeId, branch: 'true' },
        durationMs: 0,
      },
    }
  }
}
