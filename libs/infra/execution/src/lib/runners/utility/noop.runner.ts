import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class NoopRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'noop'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // No-op: passes through without transformation
    return {
      output: {
        mediaType: 'text',
        text: 'No operation.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
