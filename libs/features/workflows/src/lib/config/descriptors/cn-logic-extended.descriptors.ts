/**
 * CN — Logic Extended node config descriptors.
 *
 * Covers: if_condition, try_catch, merge, split_in_batches, stop_return.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const ifConditionDescriptor: RunnerConfigDescriptor = {
  nodeType: 'if_condition',
  displayName: 'If / Condition',
  category: 'logic',
  fields: [
    {
      key: 'condition',
      label: 'Condition',
      type: 'text',
      required: true,
      mono: true,
      placeholder: 'e.g. {{n1.score}} > 7',
    },
    {
      key: 'inputPath',
      label: 'Input Path',
      type: 'text',
      hint: 'Optional path to extract value before evaluating.',
    },
  ],
  outputFields: [
    { key: 'result', type: 'boolean', description: 'Evaluation result' },
  ],
}

export const tryCatchDescriptor: RunnerConfigDescriptor = {
  nodeType: 'try_catch',
  displayName: 'Try / Catch',
  category: 'logic',
  banner: {
    text: 'Wraps downstream in error handling.',
    variant: 'info',
  },
  fields: [
    {
      key: 'maxRetries',
      label: 'Max Retries',
      type: 'number',
      defaultValue: '2',
      min: 0,
      max: 5,
    },
    {
      key: 'retryDelayMs',
      label: 'Retry Delay (ms)',
      type: 'number',
      defaultValue: '1000',
      min: 0,
      max: 30000,
    },
  ],
  outputFields: [
    { key: 'success', type: 'boolean', description: 'Whether execution succeeded' },
    { key: 'error', type: 'object', description: 'Error details if failed' },
  ],
}

export const mergeDescriptor: RunnerConfigDescriptor = {
  nodeType: 'merge',
  displayName: 'Merge',
  category: 'logic',
  fields: [
    {
      key: 'mode',
      label: 'Merge Mode',
      type: 'select',
      required: true,
      options: [
        { label: 'Combine', value: 'combine' },
        { label: 'Zip', value: 'zip' },
        { label: 'Append', value: 'append' },
        { label: 'Outer Join', value: 'outer_join' },
      ],
    },
    {
      key: 'mergeKey',
      label: 'Merge Key',
      type: 'text',
      hint: 'Required for outer_join mode.',
    },
  ],
  outputFields: [
    { key: 'merged', type: 'array', description: 'Merged result set' },
  ],
}

export const splitInBatchesDescriptor: RunnerConfigDescriptor = {
  nodeType: 'split_in_batches',
  displayName: 'Split in Batches',
  category: 'logic',
  fields: [
    {
      key: 'batchSize',
      label: 'Batch Size',
      type: 'number',
      required: true,
      defaultValue: '10',
      min: 1,
      max: 1000,
    },
    {
      key: 'delayBetweenMs',
      label: 'Delay Between Batches (ms)',
      type: 'number',
      defaultValue: '0',
      min: 0,
      max: 60000,
    },
  ],
  outputFields: [
    { key: 'batch', type: 'array', description: 'Current batch of items' },
    { key: 'batchIndex', type: 'number', description: 'Zero-based batch index' },
    { key: 'totalBatches', type: 'number', description: 'Total number of batches' },
  ],
}

export const stopReturnDescriptor: RunnerConfigDescriptor = {
  nodeType: 'stop_return',
  displayName: 'Stop / Return',
  category: 'logic',
  fields: [
    {
      key: 'status',
      label: 'Exit Status',
      type: 'select',
      required: true,
      options: [
        { label: 'Success', value: 'success' },
        { label: 'Error', value: 'error' },
        { label: 'Cancelled', value: 'cancelled' },
      ],
    },
    {
      key: 'message',
      label: 'Message',
      type: 'textarea',
      placeholder: 'Optional exit message.',
    },
  ],
  outputFields: [
    { key: 'status', type: 'string', description: 'Final workflow status' },
  ],
}
