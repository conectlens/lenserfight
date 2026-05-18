import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class RenameFieldRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'rename_field'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — rename fields in upstream data objects
    return {
      output: {
        mediaType: 'text',
        text: 'Field renamed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
