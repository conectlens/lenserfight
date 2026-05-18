/**
 * TextToImageRunner — delegates text-to-image generation to `ctx.executeProvider`.
 *
 * GRASP Information Expert: owns the prompt extraction and output shaping for
 * the text_to_image node type. Provider selection and model wiring are owned
 * by the DAG engine's closed-over executeProvider function.
 *
 * Config schema (nodeConfig):
 *   width?:       number  — output width in pixels
 *   height?:      number  — output height in pixels
 *   n?:           number  — number of images to generate (default: 1)
 *   quality?:     string  — 'standard' | 'hd'
 *   style?:       string  — 'vivid' | 'natural'
 *   aspectRatio?: string  — e.g. '16:9'
 */

import type { ExecutionInput, WorkflowNodeType } from '../../execution.types'
import type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from '../node-runner.interface'

export class TextToImageRunner implements INodeRunner {
  readonly nodeType: WorkflowNodeType = 'text_to_image'

  async execute(ctx: NodeRunnerContext): Promise<NodeRunnerResult> {
    const startedAt = Date.now()
    const { resolvedPrompt, executeProvider, nodeConfig, signal } = ctx

    if (!resolvedPrompt || !executeProvider) {
      return {
        output: {
          mediaType: 'image',
          data: {
            nodeId:   ctx.nodeId,
            fallback: true,
            error:    !resolvedPrompt ? 'text_to_image: resolvedPrompt is required' : 'text_to_image: no provider wired',
          },
          durationMs: 0,
        },
      }
    }

    if (signal?.aborted) {
      throw new Error('Execution aborted')
    }

    const imageParams: Record<string, unknown> = {}
    if (nodeConfig['width'])       imageParams['width']       = nodeConfig['width']
    if (nodeConfig['height'])      imageParams['height']      = nodeConfig['height']
    if (nodeConfig['n'])           imageParams['n']           = nodeConfig['n']
    if (nodeConfig['quality'])     imageParams['quality']     = nodeConfig['quality']
    if (nodeConfig['style'])       imageParams['style']       = nodeConfig['style']
    if (nodeConfig['aspectRatio']) imageParams['aspectRatio'] = nodeConfig['aspectRatio']

    const input: ExecutionInput = {
      prompt: resolvedPrompt,
      ...(Object.keys(imageParams).length > 0 ? { params: imageParams } : {}),
    }

    const result = await executeProvider(input)

    return {
      output: {
        ...result,
        mediaType:  'image',
        durationMs: Date.now() - startedAt,
        metadata: {
          ...(result.metadata ?? {}),
          executedBy: 'text_to_image_runner',
        },
      },
    }
  }
}
