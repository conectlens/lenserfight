/**
 * CN — Data node config descriptors.
 *
 * Covers: json_transform.
 * (set_variables uses a custom form.)
 */

import type { RunnerConfigDescriptor } from '../../types'

export const jsonTransformDescriptor: RunnerConfigDescriptor = {
  nodeType: 'json_transform',
  displayName: 'JSON Transform',
  category: 'data',
  fields: [
    {
      key: 'expression',
      label: 'JSONPath Expression',
      type: 'text',
      placeholder: 'e.g. items[0].name or user.profile.email',
      mono: true,
      hint: 'Dot-notation path with optional bracket indexing.',
      tooltip: {
        summary: 'Extracts a value from the upstream JSON output using a dot-notation path.',
        format: 'Dot-notation (e.g. user.name) with bracket indexing (e.g. items[0]). Nested: user.addresses[1].city.',
        commonMistakes: 'Using $ prefix (not needed here). Forgetting that arrays are 0-indexed. Referencing a field that doesn\'t exist returns undefined.',
        executionImpact: 'If the path resolves to undefined, the output value will be null. The workflow continues — downstream nodes should handle null gracefully.',
      },
    },
    {
      key: 'sourceNodeId',
      label: 'Source Node ID (optional)',
      type: 'text',
      placeholder: 'Leave empty for first upstream',
    },
  ],
  outputFields: [
    { key: 'value', type: 'any', description: 'Extracted value from the path' },
  ],
}
