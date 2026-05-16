import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class LensExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'lens_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — execute a lens (AI model) with given prompt and config
    return {
      output: {
        mediaType: 'text',
        text: 'Lens executed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
