import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class SqlQueryRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'sql_query'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — execute parameterized read-only SQL against Supabase
    return {
      output: {
        mediaType: 'text',
        data: { rows: [], count: 0, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
