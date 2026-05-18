import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class GithubPrReviewRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'github_pr_review'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — fetch PR diff and files from GitHub API for automated review
    return {
      output: {
        mediaType: 'text',
        data: { diff: '', files: [], metadata: {}, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
