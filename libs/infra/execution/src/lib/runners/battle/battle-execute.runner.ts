import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class BattleExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'battle_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — orchestrate battle execution lifecycle
    return {
      output: {
        mediaType: 'text',
        text: 'Battle executed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
