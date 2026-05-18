import type { WorkflowNodeType } from '../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './node-runner.interface'

export class ObjectStorageUploadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'object_storage_upload'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — upload file/binary to Supabase Storage bucket
    return {
      output: {
        mediaType: 'text',
        data: { url: '', key: '', size: 0, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}

export class ObjectStorageDownloadRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'object_storage_download'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    // TODO: implement — download file from Supabase Storage by path
    return {
      output: {
        mediaType: 'text',
        data: { content: null, metadata: {}, nodeId: ctx.nodeId },
        durationMs: 0,
      },
    }
  }
}
