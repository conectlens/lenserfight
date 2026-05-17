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
      tooltip: {
        summary: 'A boolean expression evaluated at runtime to decide which branch the workflow takes.',
        format: 'JavaScript-like expression. Use {{nodeId.field}} to reference upstream values. Supports ==, !=, >, <, >=, <=, &&, ||.',
        commonMistakes: 'Using = instead of == for comparison. Comparing strings without quotes (use {{n1.status}} == "done").',
        executionImpact: 'If true, the "true" branch executes. If false, the "false" branch executes. Non-boolean results are truthy/falsy coerced.',
      },
    },
    {
      key: 'inputPath',
      label: 'Input Path',
      type: 'text',
      hint: 'Optional path to extract value before evaluating.',
      tooltip: {
        summary: 'Extracts a nested value from the upstream output before the condition is evaluated.',
        format: 'Dot-notation path (e.g. data.results). The extracted value becomes the evaluation context.',
        whenRequired: 'When the upstream output is deeply nested and you want a cleaner condition expression.',
      },
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
      tooltip: {
        summary: 'How many times the wrapped downstream nodes are retried after a failure.',
        format: 'Integer between 0 and 5. 0 means no retries (fail immediately).',
        executionImpact: 'Each retry re-executes all downstream nodes in the try block. High values with AI nodes multiply token costs.',
      },
    },
    {
      key: 'retryDelayMs',
      label: 'Retry Delay (ms)',
      type: 'number',
      defaultValue: '1000',
      min: 0,
      max: 30000,
      tooltip: {
        summary: 'How long to wait between retry attempts.',
        format: 'Integer in milliseconds. 0 = immediate retry.',
        commonMistakes: 'Setting to 0 for rate-limited APIs, which causes repeated 429 errors.',
      },
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
      tooltip: {
        summary: 'How multiple upstream inputs are combined into a single output.',
        format: 'Combine merges objects by key. Zip pairs items by index. Append concatenates arrays. Outer Join matches on a shared key.',
        commonMistakes: 'Using Zip when arrays have different lengths — shorter array determines output size. Using Outer Join without setting mergeKey.',
      },
    },
    {
      key: 'mergeKey',
      label: 'Merge Key',
      type: 'text',
      hint: 'Required for outer_join mode.',
      tooltip: {
        summary: 'The field name used to match records across inputs when using Outer Join mode.',
        whenRequired: 'Required when mode is set to outer_join. Ignored for other modes.',
        format: 'Field name present in both input datasets (e.g. id, email).',
        commonMistakes: 'Referencing a key that exists in only one of the inputs, which produces empty matches.',
      },
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
      tooltip: {
        summary: 'Number of items to include in each batch when splitting the input array.',
        format: 'Integer between 1 and 1000.',
        executionImpact: 'Smaller batches create more iterations but reduce memory per iteration. Larger batches are fewer iterations but heavier.',
      },
    },
    {
      key: 'delayBetweenMs',
      label: 'Delay Between Batches (ms)',
      type: 'number',
      defaultValue: '0',
      min: 0,
      max: 60000,
      tooltip: {
        summary: 'Pause duration between processing consecutive batches.',
        format: 'Integer in milliseconds. 0 = no pause between batches.',
        whenRequired: 'Useful when downstream nodes call rate-limited APIs to avoid 429 errors.',
        executionImpact: 'Adds total delay of (totalBatches - 1) * delayBetweenMs to the workflow run.',
      },
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
      tooltip: {
        summary: 'The final status code the workflow reports when it terminates at this node.',
        executionImpact: 'Determines the workflow run result status. "Error" marks the run as failed even if all prior nodes succeeded.',
      },
    },
    {
      key: 'message',
      label: 'Message',
      type: 'textarea',
      placeholder: 'Optional exit message.',
      tooltip: {
        summary: 'A human-readable message explaining why the workflow was stopped.',
        format: 'Free-form text. Supports {{variable}} interpolation.',
        executionImpact: 'Stored in the workflow run record and visible in the run history UI.',
      },
    },
  ],
  outputFields: [
    { key: 'status', type: 'string', description: 'Final workflow status' },
  ],
}
