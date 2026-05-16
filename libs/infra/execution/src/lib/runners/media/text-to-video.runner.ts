import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToVideoRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_video'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — generate video from text prompt via provider
    return {
      output: {
        mediaType: 'video',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
