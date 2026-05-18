import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class ExtractFieldRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'extract_field'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — extract specific field(s) from upstream data
    return {
      output: {
        mediaType: 'text',
        text: 'Field extracted.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
