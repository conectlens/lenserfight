import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class VideoAnalyzeRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'video_analyze'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — analyze video content using multimodal model
    return {
      output: {
        mediaType: 'text',
        text: 'Video analyzed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
