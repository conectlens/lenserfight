/**
 * validateParameterMapping — type-compatibility check between an upstream
 * node's output field type and a downstream config input field type.
 *
 * The three results:
 *   'compatible'   — safe to use without transformation
 *   'warning'      — usable but may stringify or lose structure; show advisory
 *   'incompatible' — semantically meaningless pairing; block or warn strongly
 *
 * This does NOT prevent the user from saving the mapping (they can override),
 * but the UI should show actionable feedback for 'warning' and 'incompatible'.
 */
import type { WorkflowNodeIOType } from '@lenserfight/infra/execution'
import type { RunnerConfigFieldType } from '../types/workflow-node.types'

export type MappingCompatibility = 'compatible' | 'warning' | 'incompatible'

/**
 * Check whether an upstream output field of `outputType` can be used as input
 * for a config field of `inputFieldType` without data loss or semantic mismatch.
 */
export function validateParameterMapping(
  outputType: WorkflowNodeIOType | string,
  inputFieldType: RunnerConfigFieldType,
): MappingCompatibility {
  // 'any' on either side: warn but allow — we cannot statically determine safety
  if (outputType === 'any') return 'warning'

  switch (inputFieldType) {
    case 'text':
    case 'textarea':
      return textInputCompatibility(outputType)

    case 'code':
    case 'json':
      return jsonInputCompatibility(outputType)

    case 'number':
      return numberInputCompatibility(outputType)

    case 'boolean':
      return booleanInputCompatibility(outputType)

    case 'select':
      // Select expects a discrete string value; only text is safe
      return outputType === 'text' ? 'compatible' : 'warning'

    case 'datetime':
      return outputType === 'text' ? 'compatible' : 'warning'

    default:
      return 'warning'
  }
}

function textInputCompatibility(outputType: WorkflowNodeIOType | string): MappingCompatibility {
  switch (outputType) {
    case 'text':
      return 'compatible'
    case 'number':
    case 'boolean':
      return 'compatible'         // safe coercion to string
    case 'json':
    case 'object':
    case 'array':
    case 'lens_result':
    case 'agent_result':
    case 'workflow_result':
    case 'battle_result':
      return 'warning'             // will be JSON.stringify'd
    case 'image':
    case 'audio':
    case 'video':
    case 'file':
      return 'warning'             // gives a URL string — probably not intended
    case 'embedding':
      return 'incompatible'        // numeric vector — meaningless as text
    case 'document[]':
      return 'warning'             // array of documents serialised
    case 'error':
      return 'warning'
    case 'void':
      return 'incompatible'
    default:
      return 'warning'
  }
}

function jsonInputCompatibility(outputType: WorkflowNodeIOType | string): MappingCompatibility {
  switch (outputType) {
    case 'json':
    case 'object':
    case 'array':
    case 'lens_result':
    case 'agent_result':
    case 'workflow_result':
    case 'battle_result':
    case 'document[]':
      return 'compatible'
    case 'text':
    case 'number':
    case 'boolean':
    case 'image':
    case 'audio':
    case 'video':
    case 'file':
      return 'warning'             // valid JSON but lossy or URL-shaped
    case 'embedding':
      return 'warning'             // numeric vector — valid JSON array but large
    case 'error':
      return 'warning'
    case 'void':
      return 'incompatible'
    default:
      return 'warning'
  }
}

function numberInputCompatibility(outputType: WorkflowNodeIOType | string): MappingCompatibility {
  switch (outputType) {
    case 'number':
      return 'compatible'
    case 'text':
    case 'boolean':
      return 'warning'             // may parse as NaN
    default:
      return 'incompatible'
  }
}

function booleanInputCompatibility(outputType: WorkflowNodeIOType | string): MappingCompatibility {
  switch (outputType) {
    case 'boolean':
      return 'compatible'
    case 'text':
    case 'number':
      return 'warning'             // truthy coercion
    default:
      return 'incompatible'
  }
}
