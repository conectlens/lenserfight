import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SummarizerRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'summarizer'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — summarize input text using configured model
    return {
      output: {
        mediaType: 'text',
        text: 'Text summarized.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
