import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageToImageRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_to_image'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — transform image using style transfer or img2img model
    return {
      output: {
        mediaType: 'image',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
