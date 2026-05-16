import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class AgentExecuteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'agent_execute'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — execute an autonomous agent with tools and memory
    return {
      output: {
        mediaType: 'text',
        text: 'Agent executed.',
        data: { nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
