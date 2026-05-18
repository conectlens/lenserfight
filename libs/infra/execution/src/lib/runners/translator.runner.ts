import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class TranslatorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'translator'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — translate text between languages
    return {
      output: {
        mediaType: 'text',
        text: 'Text translated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
