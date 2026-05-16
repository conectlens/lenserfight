import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class ClassifierRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'classifier'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — classify input into configured categories
    return {
      output: {
        mediaType: 'text',
        text: 'Input classified.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
