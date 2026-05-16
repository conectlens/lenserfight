import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class MediaConvertRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'media_convert'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — convert media between formats (e.g. png→webp, mp4→gif)
    return {
      output: {
        mediaType: 'text',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
