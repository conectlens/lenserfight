import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToImageRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_image'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — generate image from text prompt via provider
    return {
      output: {
        mediaType: 'image',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
