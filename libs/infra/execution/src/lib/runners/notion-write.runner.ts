import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class NotionWriteRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'notion_write'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const databaseId = ctx.nodeConfig['databaseId'] as string | undefined
    const properties = ctx.nodeConfig['properties'] as Record<string, unknown> | undefined
    const content = ctx.nodeConfig['content'] as string | undefined

    if (!databaseId || typeof databaseId !== 'string') {
      return { output: { mediaType: 'json', text: '', data: { error: 'Missing databaseId', nodeId: ctx.nodeId }, durationMs: 0 } }
    }

    if (!properties || typeof properties !== 'object') {
      return { output: { mediaType: 'json', text: '', data: { error: 'Missing Notion properties', nodeId: ctx.nodeId }, durationMs: 0 } }
    }

    if (connectorRef && ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: 'notion',
          capability: 'database',
          operation: content ? 'append_block' : 'create_page',
          requiredScopes: ['notion:write'],
          params: { databaseId, properties, content: content ?? null },
        }),
      }
    }

    return {
      output: {
        mediaType: 'json',
        text: `[Notion create page: ${databaseId}]`,
        data: { id: '', url: '', nodeId: ctx.nodeId, databaseId, hasContent: Boolean(content), mock: true },
        durationMs: 0,
      },
    }
  }
}
