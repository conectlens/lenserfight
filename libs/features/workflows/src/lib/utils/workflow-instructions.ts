/**
 * Feature-side access to the generated workflow instructions.
 *
 * The text is derived from the node catalog and the protocol, which are both
 * static for the lifetime of the bundle, so it is built once per format and
 * cached. Regenerating it on every render would walk the whole catalog and
 * concatenate a few thousand characters for no benefit.
 */
import { buildWorkflowInstructions } from '@lenserfight/infra/workflow-authoring'

import type { WorkflowInstructionFormat } from '@lenserfight/infra/workflow-authoring'

const cache = new Map<WorkflowInstructionFormat, string>()

export function buildWorkflowInstructionsText(
  format: WorkflowInstructionFormat = 'json',
): string {
  const cached = cache.get(format)
  if (cached !== undefined) return cached

  const text = buildWorkflowInstructions({ format })
  cache.set(format, text)
  return text
}
