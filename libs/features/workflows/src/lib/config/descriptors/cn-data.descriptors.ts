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
