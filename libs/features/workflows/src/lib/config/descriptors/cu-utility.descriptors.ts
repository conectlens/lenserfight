/**
 * CU — Utility node config descriptors.
 *
 * Covers: logger, debug_inspector, secret_resolver, rate_limit,
 *         cache_read, cache_write, retry, noop.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const loggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'logger',
  displayName: 'Logger',
  category: 'utility',
  fields: [
    {
      key: 'level',
      label: 'Log Level',
      type: 'select',
      defaultValue: 'info',
      options: [
        { label: 'Debug', value: 'debug' },
        { label: 'Info', value: 'info' },
        { label: 'Warn', value: 'warn' },
        { label: 'Error', value: 'error' },
      ],
    },
    {
      key: 'label',
      label: 'Label',
      type: 'text',
    },
    {
      key: 'includeTimestamp',
      label: 'Include Timestamp',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'logged', type: 'boolean', description: 'Whether the log was written' },
  ],
}

export const debugInspectorDescriptor: RunnerConfigDescriptor = {
  nodeType: 'debug_inspector',
  displayName: 'Debug Inspector',
  category: 'utility',
  fields: [
    {
      key: 'maxDepth',
      label: 'Max Depth',
      type: 'number',
      defaultValue: '3',
      min: 1,
      max: 10,
    },
    {
      key: 'showTypes',
      label: 'Show Types',
      type: 'boolean',
      defaultValue: 'true',
    },
    {
      key: 'showSizes',
      label: 'Show Sizes',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'inspection', type: 'object', description: 'Inspection result' },
  ],
}

export const secretResolverDescriptor: RunnerConfigDescriptor = {
  nodeType: 'secret_resolver',
  displayName: 'Secret Resolver',
  category: 'utility',
  banner: {
    text: 'Secret values are never exposed in logs or outputs.',
    variant: 'warning',
  },
  fields: [
    {
      key: 'secretName',
      label: 'Secret Name',
      type: 'text',
      required: true,
    },
    {
      key: 'provider',
      label: 'Provider',
      type: 'select',
      defaultValue: 'vault',
      options: [
        { label: 'Vault', value: 'vault' },
        { label: 'Environment', value: 'env' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope',
      type: 'select',
      defaultValue: 'workflow',
      options: [
        { label: 'Workflow', value: 'workflow' },
        { label: 'Global', value: 'global' },
      ],
    },
  ],
  outputFields: [
    { key: 'resolved', type: 'boolean', description: 'Whether the secret was resolved' },
  ],
}

export const rateLimitDescriptor: RunnerConfigDescriptor = {
  nodeType: 'rate_limit',
  displayName: 'Rate Limit',
  category: 'utility',
  fields: [
    {
      key: 'maxRequests',
      label: 'Max Requests',
      type: 'number',
      required: true,
      min: 1,
      max: 10000,
    },
    {
      key: 'windowMs',
      label: 'Window (ms)',
      type: 'number',
      required: true,
      min: 1000,
      max: 3600000,
      hint: 'Time window in ms.',
    },
    {
      key: 'key',
      label: 'Rate Limit Key',
      type: 'text',
      mono: true,
      placeholder: 'email_send_{{ctx.lenserId}}',
    },
    {
      key: 'strategy',
      label: 'Strategy',
      type: 'select',
      defaultValue: 'sliding_window',
      options: [
        { label: 'Sliding Window', value: 'sliding_window' },
        { label: 'Fixed Window', value: 'fixed_window' },
        { label: 'Token Bucket', value: 'token_bucket' },
      ],
    },
  ],
  outputFields: [
    { key: 'allowed', type: 'boolean', description: 'Whether the request is allowed' },
    { key: 'remaining', type: 'number', description: 'Remaining requests in window' },
  ],
}

export const cacheReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'cache_read',
  displayName: 'Cache Read',
  category: 'utility',
  fields: [
    {
      key: 'key',
      label: 'Cache Key',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'namespace',
      label: 'Namespace',
      type: 'text',
      defaultValue: 'workflow_cache',
    },
  ],
  outputFields: [
    { key: 'value', type: 'unknown', description: 'Cached value' },
    { key: 'hit', type: 'boolean', description: 'Whether the cache had a value' },
  ],
}

export const cacheWriteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'cache_write',
  displayName: 'Cache Write',
  category: 'utility',
  fields: [
    {
      key: 'key',
      label: 'Cache Key',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 1000,
      max: 604800000,
      hint: 'Default: 24 hours.',
    },
    {
      key: 'namespace',
      label: 'Namespace',
      type: 'text',
      defaultValue: 'workflow_cache',
    },
  ],
  outputFields: [
    { key: 'written', type: 'boolean', description: 'Whether the value was cached' },
  ],
}

export const retryDescriptor: RunnerConfigDescriptor = {
  nodeType: 'retry',
  displayName: 'Retry',
  category: 'utility',
  fields: [
    {
      key: 'maxRetries',
      label: 'Max Retries',
      type: 'number',
      required: true,
      defaultValue: '3',
      min: 1,
      max: 10,
    },
    {
      key: 'backoffStrategy',
      label: 'Backoff Strategy',
      type: 'select',
      defaultValue: 'exponential',
      options: [
        { label: 'Exponential', value: 'exponential' },
        { label: 'Linear', value: 'linear' },
        { label: 'Constant', value: 'constant' },
      ],
    },
    {
      key: 'initialDelayMs',
      label: 'Initial Delay (ms)',
      type: 'number',
      defaultValue: '1000',
      min: 100,
      max: 60000,
    },
    {
      key: 'maxDelayMs',
      label: 'Max Delay (ms)',
      type: 'number',
      defaultValue: '30000',
      min: 1000,
      max: 300000,
    },
    {
      key: 'retryableErrors',
      label: 'Retryable Error Codes',
      type: 'json',
      hint: 'Array of error codes.',
    },
  ],
  outputFields: [
    { key: 'succeeded', type: 'boolean', description: 'Whether execution succeeded' },
    { key: 'attempts', type: 'number', description: 'Total attempts made' },
  ],
}

export const noopDescriptor: RunnerConfigDescriptor = {
  nodeType: 'noop',
  displayName: 'No-Op',
  category: 'utility',
  fields: [
    {
      key: 'note',
      label: 'Note',
      type: 'textarea',
      rows: 2,
      placeholder: 'Notes for documentation purposes.',
    },
  ],
  outputFields: [
    { key: 'passthrough', type: 'unknown', description: 'Passes input through unchanged' },
  ],
}
