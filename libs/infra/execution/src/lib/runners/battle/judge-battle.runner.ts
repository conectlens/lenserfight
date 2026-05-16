import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class JudgeBattleRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'judge_battle'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — invoke judge lens to evaluate battle contender outputs
    return {
      output: {
        mediaType: 'text',
        text: 'Battle judged.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
