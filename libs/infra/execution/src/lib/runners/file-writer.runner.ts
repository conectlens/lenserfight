import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class FileWriterRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'file_writer'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const destination = String(ctx.nodeConfig['destination'] ?? ctx.nodeConfig['bucket'] ?? 'workflow-outputs')
    const objectKey = String(
      ctx.nodeConfig['objectKey'] ??
        ctx.nodeConfig['objectKeyTemplate'] ??
        `${ctx.nodeId}.json`,
    )
    const contentPath = String(ctx.nodeConfig['contentPath'] ?? '$')
    const firstUpstream = ctx.upstreamOutputs.values().next().value
    const content = firstUpstream?.data ?? firstUpstream?.text ?? ''

    return {
      output: {
        mediaType: 'text',
        text: `[File Write: ${destination}/${objectKey}]`,
        data: {
          __file_write_request: true,
          destination,
          objectKey,
          contentPath,
          content,
        },
        durationMs: 0,
      },
      variableMutations: {
        __file_write_destination: destination,
        __file_write_object_key: objectKey,
      },
    }
  }
}
