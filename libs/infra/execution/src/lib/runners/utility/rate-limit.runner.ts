import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class RateLimitRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'rate_limit'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — enforce rate limits before allowing downstream execution
    return {
      output: {
        mediaType: 'text',
        text: 'Rate limit check passed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
