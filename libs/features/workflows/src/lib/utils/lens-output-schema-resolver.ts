/**
 * lensOutputSchemaResolver — unified output schema lookup for any node type.
 *
 * Every node in the DAG produces an output schema. This module provides a
 * single function that returns the most specific schema available:
 *
 *   1. For lens nodes with a declared LensOutputContract:
 *      Use the contract's `schema` fields, converting ContractFieldType → NodeIOType.
 *   2. For lens nodes without a contract:
 *      Return the catalog defaults (text + lens_result).
 *   3. For all other node types:
 *      Return the execution catalog's `outputs` for that type.
 *   4. Fallback:
 *      Return [{name:'output', type:'any'}] so panels never crash on unknown nodes.
 *
 * The returned fields are used by WorkflowUpstreamOutputPanel and
 * WorkflowOutputFieldTree for schema-based display before a run, and for
 * type-compatibility validation when the user drags a field.
 */
import { getWorkflowNodeCatalogEntry } from '@lenserfight/infra/execution'
import type { WorkflowNodeSchemaField } from '@lenserfight/infra/execution'
import type { LensOutputContract } from '@lenserfight/types'

const LENS_DEFAULT_OUTPUTS: WorkflowNodeSchemaField[] = [
  { name: 'text', type: 'text', description: 'Generated text output' },
  { name: 'result', type: 'lens_result', description: 'Full Lens execution result with metadata' },
]

const FALLBACK_OUTPUTS: WorkflowNodeSchemaField[] = [
  { name: 'output', type: 'any', description: 'Node output' },
]

/**
 * Return the output schema for a node.
 *
 * @param nodeType   The node's type key (e.g. 'manual_trigger', 'lens', 'code')
 * @param lensOutputContract  Optional: declared output contract from the lens version record
 * @returns  Array of output field descriptors, never empty
 */
export function resolveLensOutputSchema(
  nodeType: string,
  lensOutputContract?: LensOutputContract | null,
): WorkflowNodeSchemaField[] {
  if (nodeType === 'lens') {
    return resolveLensFields(lensOutputContract)
  }

  const entry = getWorkflowNodeCatalogEntry(nodeType)
  if (entry && entry.outputs.length > 0) {
    return entry.outputs
  }

  return FALLBACK_OUTPUTS
}

function resolveLensFields(contract?: LensOutputContract | null): WorkflowNodeSchemaField[] {
  if (!contract?.schema || Object.keys(contract.schema).length === 0) {
    // No schema declared — add lens_result alongside the default text field
    const fields: WorkflowNodeSchemaField[] = [...LENS_DEFAULT_OUTPUTS]

    // If the contract specifies an artifactKind hint, surface it
    if (contract?.artifactKind && contract.artifactKind !== 'text') {
      fields.push({
        name: 'media',
        type: artifactKindToIOType(contract.artifactKind),
        description: `${contract.artifactKind} output`,
      })
    }
    return fields
  }

  const fields: WorkflowNodeSchemaField[] = Object.entries(contract.schema).map(([name, field]) => ({
    name,
    type: contractFieldTypeToIOType(field.type),
    required: field.required,
    description: field.description ?? '',
  }))

  // Always expose the canonical `text` output for lens nodes so prompt
  // template nodes can reference the raw generated text even when a structured
  // schema is present.
  if (!fields.some((f) => f.name === 'text')) {
    fields.unshift({ name: 'text', type: 'text', description: 'Generated text output' })
  }

  // Expose lens_result for full-metadata access
  if (!fields.some((f) => f.name === 'result')) {
    fields.push({ name: 'result', type: 'lens_result', description: 'Full Lens execution result with metadata' })
  }

  // Mark contract as containing sensitive data
  if (contract.containsSensitive) {
    fields.forEach((f) => {
      ;(f as WorkflowNodeSchemaField & { sensitive?: boolean }).sensitive = true
    })
  }

  return fields
}

function contractFieldTypeToIOType(contractType: string): WorkflowNodeSchemaField['type'] {
  switch (contractType) {
    case 'string':
    case 'url':
      return 'text'
    case 'number':
    case 'integer':
      return 'number'
    case 'boolean':
      return 'boolean'
    case 'json':
      return 'json'
    case 'array':
      return 'array'
    case 'any':
    default:
      return 'any'
  }
}

function artifactKindToIOType(artifactKind: string): WorkflowNodeSchemaField['type'] {
  switch (artifactKind) {
    case 'image':
      return 'image'
    case 'audio':
      return 'audio'
    case 'video':
      return 'video'
    case 'document':
      return 'file'
    default:
      return 'any'
  }
}
