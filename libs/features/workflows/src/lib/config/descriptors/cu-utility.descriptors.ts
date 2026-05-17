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
      tooltip: {
        summary: 'The severity level of the log entry.',
        executionImpact: 'Debug logs are only visible in detailed run inspection. Error logs are highlighted in the run history.',
      },
    },
    {
      key: 'label',
      label: 'Label',
      type: 'text',
      tooltip: {
        summary: 'An optional label prefix for the log entry, useful for identifying logs from specific nodes.',
        format: 'Free-form text (e.g. "step-3-output", "validation-check").',
      },
    },
    {
      key: 'includeTimestamp',
      label: 'Include Timestamp',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to prepend a timestamp to the log entry.',
      },
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
      tooltip: {
        summary: 'How many levels deep to inspect nested objects and arrays.',
        format: 'Integer between 1 and 10.',
        executionImpact: 'Higher depth produces more detailed output but may be overwhelming for complex objects.',
      },
    },
    {
      key: 'showTypes',
      label: 'Show Types',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to annotate each value with its JavaScript type (string, number, object, etc.).',
      },
    },
    {
      key: 'showSizes',
      label: 'Show Sizes',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to show byte sizes for strings and element counts for arrays.',
      },
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
      tooltip: {
        summary: 'The name of the secret to resolve from the configured provider.',
        format: 'Secret key name (e.g. OPENAI_API_KEY, SLACK_TOKEN).',
        executionImpact: 'The resolved value is available to downstream nodes but never appears in logs or outputs.',
      },
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
      tooltip: {
        summary: 'Where to look up the secret. Vault uses the secure secret store. Environment reads from process environment.',
        executionImpact: 'Vault secrets are encrypted at rest. Environment variables are less secure but simpler for local development.',
      },
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
      tooltip: {
        summary: 'Whether the secret is scoped to this workflow or available globally across all workflows.',
        executionImpact: 'Workflow-scoped secrets are isolated. Global secrets are shared across workflows owned by the same lenser.',
      },
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
      tooltip: {
        summary: 'Maximum number of requests allowed within the time window.',
        format: 'Integer between 1 and 10000.',
        executionImpact: 'Once the limit is reached, subsequent requests are blocked (allowed=false) until the window resets.',
      },
    },
    {
      key: 'windowMs',
      label: 'Window (ms)',
      type: 'number',
      required: true,
      min: 1000,
      max: 3600000,
      hint: 'Time window in ms.',
      tooltip: {
        summary: 'The time window in milliseconds over which requests are counted.',
        format: 'Integer in milliseconds. 60000 = 1 minute, 3600000 = 1 hour.',
      },
    },
    {
      key: 'key',
      label: 'Rate Limit Key',
      type: 'text',
      mono: true,
      placeholder: 'email_send_{{ctx.lenserId}}',
      tooltip: {
        summary: 'A unique key identifying what is being rate-limited. Supports dynamic keys for per-user limits.',
        format: 'String with optional {{variable}} interpolation. e.g. email_send_{{ctx.lenserId}} for per-user limiting.',
        commonMistakes: 'Using a static key when per-user limiting is needed, which creates a shared global limit.',
      },
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
      tooltip: {
        summary: 'The rate limiting algorithm. Sliding Window is smoothest. Fixed Window resets at intervals. Token Bucket allows bursts.',
        executionImpact: 'Sliding Window prevents burst spikes. Token Bucket allows short bursts up to the bucket size.',
      },
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
      tooltip: {
        summary: 'The key to look up in the cache.',
        format: 'String key. Supports {{variable}} interpolation for dynamic keys.',
        executionImpact: 'Returns hit=true with the cached value if found. Returns hit=false with null value if the key is missing or expired.',
      },
    },
    {
      key: 'namespace',
      label: 'Namespace',
      type: 'text',
      defaultValue: 'workflow_cache',
      tooltip: {
        summary: 'Logical namespace to scope cache keys. Prevents key collisions across different use cases.',
        format: 'Alphanumeric string with underscores.',
      },
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
      tooltip: {
        summary: 'The key under which the upstream output is cached.',
        format: 'String key. Must match the key used in the corresponding Cache Read node.',
        commonMistakes: 'Using different keys between Cache Write and Cache Read, making the cached value unretrievable.',
      },
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 1000,
      max: 604800000,
      hint: 'Default: 24 hours.',
      tooltip: {
        summary: 'How long the cached value remains valid before automatic expiry.',
        format: 'Integer in milliseconds. 86400000 = 24 hours, 604800000 = 7 days (maximum).',
        executionImpact: 'After TTL expires, Cache Read returns hit=false. Set appropriately for your data freshness needs.',
      },
    },
    {
      key: 'namespace',
      label: 'Namespace',
      type: 'text',
      defaultValue: 'workflow_cache',
      tooltip: {
        summary: 'Logical namespace to scope cache keys. Must match the namespace used in the corresponding Cache Read node.',
      },
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
      tooltip: {
        summary: 'Maximum number of retry attempts before giving up.',
        format: 'Integer between 1 and 10.',
        executionImpact: 'Total execution time is up to maxRetries * maxDelayMs in the worst case.',
      },
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
      tooltip: {
        summary: 'How the delay between retries increases. Exponential doubles each time. Linear adds a fixed increment. Constant stays the same.',
        executionImpact: 'Exponential is best for rate-limited APIs (1s, 2s, 4s, 8s...). Constant is simplest but may overwhelm struggling services.',
      },
    },
    {
      key: 'initialDelayMs',
      label: 'Initial Delay (ms)',
      type: 'number',
      defaultValue: '1000',
      min: 100,
      max: 60000,
      tooltip: {
        summary: 'The delay before the first retry attempt.',
        format: 'Integer in milliseconds.',
        executionImpact: 'With exponential backoff, subsequent delays double from this value (1000 -> 2000 -> 4000...).',
      },
    },
    {
      key: 'maxDelayMs',
      label: 'Max Delay (ms)',
      type: 'number',
      defaultValue: '30000',
      min: 1000,
      max: 300000,
      tooltip: {
        summary: 'The maximum delay between any two retry attempts. Caps exponential growth.',
        format: 'Integer in milliseconds. 30000 = 30 seconds.',
      },
    },
    {
      key: 'retryableErrors',
      label: 'Retryable Error Codes',
      type: 'string_array',
      hint: 'Add error codes that should trigger a retry.',
      tooltip: {
        summary: 'Error codes that should trigger a retry. If empty, all errors are retryable.',
        format: 'Array of error code strings (e.g. TIMEOUT, RATE_LIMITED, 429, 503).',
        commonMistakes: 'Retrying on 400 (Bad Request) errors, which never succeed on retry since the input is wrong.',
      },
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
      tooltip: {
        summary: 'A documentation note explaining why this no-op node exists in the workflow. Has no effect on execution.',
      },
    },
  ],
  outputFields: [
    { key: 'passthrough', type: 'unknown', description: 'Passes input through unchanged' },
  ],
}
