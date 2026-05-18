import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class ImageAnalyzeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_analyze'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — analyze image content using vision model
    return {
      output: {
        mediaType: 'text',
        text: 'Image analyzed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
