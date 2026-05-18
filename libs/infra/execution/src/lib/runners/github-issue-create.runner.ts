import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class GithubIssueCreateRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'github_issue_create'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const connectorRef = ctx.nodeConfig['connectorRef'] as string | undefined
    const repo = ctx.nodeConfig['repo'] as string | undefined
    const title = ctx.nodeConfig['title'] as string | undefined
    const body = ctx.nodeConfig['body'] as string | undefined
    const labels = ctx.nodeConfig['labels'] as string[] | undefined
    const assignees = ctx.nodeConfig['assignees'] as string[] | undefined

    if (!repo || !/^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/.test(repo)) {
      return { output: { mediaType: 'json', text: '', data: { error: 'Invalid repo format. Expected owner/repo', nodeId: ctx.nodeId }, durationMs: 0 } }
    }
    if (!title || !title.trim()) {
      return { output: { mediaType: 'json', text: '', data: { error: 'Missing issue title', nodeId: ctx.nodeId }, durationMs: 0 } }
    }

    if (connectorRef && ctx.executeConnectorOperation) {
      return {
        output: await ctx.executeConnectorOperation({
          connectorRef,
          provider: 'github',
          capability: 'repos',
          operation: 'create_issue',
          requiredScopes: ['repo'],
          params: { repo, title: title.trim(), body: body ?? '', labels: labels ?? [], assignees: assignees ?? [] },
        }),
      }
    }

    return {
      output: {
        mediaType: 'json',
        text: `[GitHub issue: ${repo}]`,
        data: { number: 0, url: '', title: title.trim(), nodeId: ctx.nodeId, repo, mock: true },
        durationMs: 0,
      },
    }
  }
}
