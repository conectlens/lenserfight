import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class ImageToAudioRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'image_to_audio'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — generate audio from image content via multimodal model
    return {
      output: {
        mediaType: 'audio',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
