/**
 * MediaConvertRunner — format conversion node (not yet wired).
 *
 * No conversion service exists in the provider layer yet. This runner throws
 * a descriptive NotImplementedError rather than returning a silently wrong stub.
 * This is intentionally honest about the capability boundary.
 *
 * When a conversion service is added (e.g. FFmpeg via trigger-execution edge
 * function), implement execute() to extract upstream media URL, POST to the
 * service with target format params, and return the converted URL.
 */

import type { WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class MediaConvertRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'media_convert'

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async execute(_ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    throw new Error('media_convert: no conversion service wired — not yet implemented')
  }
}
