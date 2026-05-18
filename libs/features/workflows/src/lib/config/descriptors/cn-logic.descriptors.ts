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
      tooltip: {
        summary: 'How long the workflow pauses before continuing to the next node.',
        format: 'Integer in milliseconds. 1000 = 1 second, 60000 = 1 minute.',
        commonMistakes: 'Entering seconds instead of milliseconds. Setting to 0 still yields a microtask pause, not instant.',
        executionImpact: 'The workflow run is suspended for this duration. Long delays hold the run slot open and count toward execution time limits.',
      },
    },
    {
      key: 'delayUntil',
      label: 'Or wait until (ISO timestamp, optional)',
      type: 'datetime',
      placeholder: '',
      hint: 'Takes priority over delay ms if set.',
      tooltip: {
        summary: 'Pauses the workflow until a specific date and time instead of a relative delay.',
        whenRequired: 'Use when you need the workflow to resume at an exact wall-clock time rather than after a duration.',
        format: 'ISO 8601 timestamp (e.g. 2026-06-01T14:00:00Z). Supports {{variable}} interpolation.',
        executionImpact: 'Overrides delayMs when set. If the timestamp is in the past, the node completes immediately.',
      },
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
      tooltip: {
        summary: 'Dot-notation path to the array within the upstream output that the loop should iterate over.',
        format: 'Dot-notation path (e.g. results.items, data[0].entries). Leave empty if the upstream output is already an array.',
        commonMistakes: 'Pointing to a non-array value causes the loop to run once with that value as the single item.',
      },
    },
    {
      key: 'itemVariable',
      label: 'Item Variable Name',
      type: 'text',
      defaultValue: 'item',
      placeholder: 'item',
      tooltip: {
        summary: 'The variable name used to reference the current item inside the loop body.',
        format: 'Valid JavaScript identifier (e.g. item, entry, row). No spaces or special characters.',
        commonMistakes: 'Using a name that collides with an upstream node ID, which shadows the node output.',
      },
    },
    {
      key: 'maxItems',
      label: 'Max Items',
      type: 'number',
      defaultValue: '1000',
      min: 1,
      max: 1000,
      tooltip: {
        summary: 'Caps the number of items the loop processes to prevent runaway iteration.',
        format: 'Integer between 1 and 1000.',
        executionImpact: 'Items beyond this limit are silently dropped. The totalCount output still reflects the original array length.',
      },
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
      tooltip: {
        summary: 'A default value emitted as the node output when an error is caught from upstream.',
        format: 'Any string value. Will be passed as-is to downstream nodes.',
        executionImpact: 'If set, downstream nodes receive this value instead of the error. If empty, downstream nodes receive the error object.',
      },
    },
    {
      key: 'continueOnError',
      label: 'Continue workflow after catching error',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether the workflow continues executing downstream nodes after catching an error.',
        executionImpact: 'When true, the error is swallowed and the workflow proceeds with the fallback value. When false, the workflow halts at this node with a caught-error status.',
      },
    },
  ],
  outputFields: [
    { key: 'error', type: 'object', description: 'Error details (code, message, nodeId)' },
    { key: 'fallback', type: 'string', description: 'Fallback value if provided' },
  ],
}
