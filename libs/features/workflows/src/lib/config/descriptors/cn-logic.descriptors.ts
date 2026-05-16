/**
 * CN — Logic & Data Foundation node config descriptors.
 *
 * Covers: wait_delay, loop_map, error_catch.
 * (code, switch, set_variables, sub_workflow use custom forms.)
 */

import type { RunnerConfigDescriptor } from '../../types'

export const waitDelayDescriptor: RunnerConfigDescriptor = {
  nodeType: 'wait_delay',
  displayName: 'Wait / Delay',
  category: 'logic',
  fields: [
    {
      key: 'delayMs',
      label: 'Delay (ms)',
      type: 'number',
      defaultValue: '1000',
      min: 0,
      max: 86400000,
      hint: 'Max: 86,400,000ms (24 hours)',
    },
    {
      key: 'delayUntil',
      label: 'Or wait until (ISO timestamp, optional)',
      type: 'datetime',
      placeholder: '',
      hint: 'Takes priority over delay ms if set.',
    },
  ],
  outputFields: [
    { key: 'waited', type: 'boolean', description: 'Whether the delay completed' },
    { key: 'timestamp', type: 'string', description: 'Completion timestamp' },
  ],
}

export const loopMapDescriptor: RunnerConfigDescriptor = {
  nodeType: 'loop_map',
  displayName: 'Loop / Map',
  category: 'logic',
  fields: [
    {
      key: 'arrayPath',
      label: 'Array Path',
      type: 'text',
      placeholder: 'e.g. results.items (leave empty if upstream is array)',
      mono: true,
    },
    {
      key: 'itemVariable',
      label: 'Item Variable Name',
      type: 'text',
      defaultValue: 'item',
      placeholder: 'item',
    },
    {
      key: 'maxItems',
      label: 'Max Items',
      type: 'number',
      defaultValue: '1000',
      min: 1,
      max: 1000,
    },
  ],
  outputFields: [
    { key: 'items', type: 'array', description: 'Array of items to iterate over' },
    { key: 'totalCount', type: 'number', description: 'Total items before truncation' },
  ],
}

export const errorCatchDescriptor: RunnerConfigDescriptor = {
  nodeType: 'error_catch',
  displayName: 'Error Catch',
  category: 'logic',
  banner: {
    text: 'This node catches errors from upstream. Wire it as an error-edge from any node that might fail.',
    variant: 'error',
  },
  fields: [
    {
      key: 'fallbackValue',
      label: 'Fallback Value (optional)',
      type: 'text',
      placeholder: 'Default output when error is caught',
    },
    {
      key: 'continueOnError',
      label: 'Continue workflow after catching error',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'error', type: 'object', description: 'Error details (code, message, nodeId)' },
    { key: 'fallback', type: 'string', description: 'Fallback value if provided' },
  ],
}
