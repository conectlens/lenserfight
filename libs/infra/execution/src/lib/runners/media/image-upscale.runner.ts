import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageUpscaleRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_upscale'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — upscale image resolution via super-resolution model
    return {
      output: {
        mediaType: 'image',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
