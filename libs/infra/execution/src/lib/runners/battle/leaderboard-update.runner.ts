import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class LeaderboardUpdateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'leaderboard_update'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — update leaderboard rankings after battle resolution
    return {
      output: {
        mediaType: 'text',
        text: 'Leaderboard updated.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
