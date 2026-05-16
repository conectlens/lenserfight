import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class NotionWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'notion_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — create or update Notion page / database row
    return {
      output: {
        mediaType: 'text',
        data: { id: '', url: '', nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
