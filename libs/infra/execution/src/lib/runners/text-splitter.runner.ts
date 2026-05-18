import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class TextSplitterRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_splitter'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — split text into chunks by separator, size, or overlap
    return {
      output: {
        mediaType: 'text',
        text: 'Text split into chunks.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
