import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class DebugInspectorRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'debug_inspector'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — inspect and expose upstream outputs for debugging
    return {
      output: {
        mediaType: 'text',
        text: 'Debug inspection complete.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
