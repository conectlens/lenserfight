/**
 * CP — Storage & I/O node config descriptors.
 *
 * Covers: supabase_query, kv_store_read, kv_store_write, file_reader, file_writer,
 *         webhook_trigger, webhook_sender, schedule_trigger.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const supabaseQueryDescriptor: RunnerConfigDescriptor = {
  nodeType: 'supabase_query',
  displayName: 'Supabase Query',
  category: 'storage',
  fields: [
    {
      key: 'rpcName',
      label: 'RPC Function Name',
      type: 'select',
      required: true,
      options: [
        { value: 'fn_search_lenser_memory', label: 'fn_search_lenser_memory' },
        { value: 'fn_get_lenser_memory', label: 'fn_get_lenser_memory' },
        { value: 'fn_upsert_lenser_memory', label: 'fn_upsert_lenser_memory' },
        { value: 'fn_get_workflow_run_results', label: 'fn_get_workflow_run_results' },
        { value: 'fn_get_battle_scores', label: 'fn_get_battle_scores' },
        { value: 'fn_profile_completion_score', label: 'fn_profile_completion_score' },
        { value: 'fn_xp_leaderboard', label: 'fn_xp_leaderboard' },
      ],
      hint: 'Only allowlisted RPC functions can be called.',
      tooltip: {
        summary: 'The Supabase RPC function to call. Only allowlisted functions are available for security.',
        executionImpact: 'The function is called with the provided parameters at runtime. Unauthorized functions are rejected.',
      },
    },
    {
      key: 'params',
      label: 'RPC Parameters',
      type: 'key_value',
      placeholder: 'Parameter name',
      hint: 'Key-value pairs passed as RPC parameters. Values support {{expression}} syntax.',
      tooltip: {
        summary: 'The parameters passed to the RPC function call.',
        format: 'Key-value pairs matching the function signature. Values support {{nodeId.field}} interpolation.',
        commonMistakes: 'Missing required parameters or misspelling parameter names, which causes the RPC to fail.',
      },
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'Query result data' },
  ],
}

export const kvStoreReadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'kv_store_read',
  displayName: 'KV Store Read',
  category: 'storage',
  fields: [
    {
      key: 'key',
      label: 'Key',
      type: 'text',
      required: true,
      placeholder: 'e.g. cache.user-preferences',
      mono: true,
      hint: 'Max 256 chars. Alphanumeric, dash, dot, underscore.',
      tooltip: {
        summary: 'The key to look up in the workflow key-value store.',
        format: 'Max 256 characters. Alphanumeric, dash, dot, underscore only.',
        executionImpact: 'Returns the stored value if found. If the key does not exist, found=false and value is null.',
      },
    },
  ],
  outputFields: [
    { key: 'value', type: 'string', description: 'Stored value' },
    { key: 'found', type: 'boolean', description: 'Whether the key exists' },
  ],
}

export const kvStoreWriteDescriptor: RunnerConfigDescriptor = {
  nodeType: 'kv_store_write',
  displayName: 'KV Store Write',
  category: 'storage',
  fields: [
    {
      key: 'key',
      label: 'Key',
      type: 'text',
      required: true,
      placeholder: 'e.g. cache.user-preferences',
      mono: true,
      hint: 'Max 256 chars. Alphanumeric, dash, dot, underscore.',
      tooltip: {
        summary: 'The key under which the value is stored in the workflow key-value store.',
        format: 'Max 256 characters. Alphanumeric, dash, dot, underscore only.',
        commonMistakes: 'Using different key formats between write and read nodes, making the value unretrievable.',
      },
    },
    {
      key: 'value',
      label: 'Value (optional)',
      type: 'textarea',
      rows: 3,
      placeholder: 'Defaults to upstream output text',
      hint: 'Max 1MB.',
      tooltip: {
        summary: 'The value to store. Defaults to the upstream output text if left empty.',
        format: 'Any string, max 1MB. Supports {{variable}} interpolation.',
        executionImpact: 'Overwrites any existing value for this key. The previous value is lost.',
      },
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 1000,
      max: 86400000,
      hint: 'Max 24 hours (86,400,000ms).',
      tooltip: {
        summary: 'How long the stored value persists before automatic expiration.',
        format: 'Integer in milliseconds. 86400000 = 24 hours (maximum).',
        executionImpact: 'After TTL expires, the key is automatically deleted. Reading an expired key returns found=false.',
      },
    },
  ],
  outputFields: [
    { key: 'written', type: 'boolean', description: 'Whether the write succeeded' },
  ],
}

export const fileReaderDescriptor: RunnerConfigDescriptor = {
  nodeType: 'file_reader',
  displayName: 'File Reader',
  category: 'storage',
  fields: [
    {
      key: 'url',
      label: 'URL (optional)',
      type: 'text',
      placeholder: 'https://example.com/data.json',
      hint: 'Defaults to upstream URL. Max 10MB. Only allowed domains.',
      tooltip: {
        summary: 'The URL of the file to read. Uses the upstream output URL if left empty.',
        format: 'Full HTTPS URL. Only allowed domains are permitted (default: supabase.co, lenserfight.com).',
        commonMistakes: 'Using HTTP instead of HTTPS, which is blocked. Pointing to a domain not in the allowed list.',
        executionImpact: 'File is downloaded at runtime. Max 10MB size limit.',
      },
    },
    {
      key: 'allowedDomains',
      label: 'Additional Allowed Domains (comma-separated)',
      type: 'text',
      placeholder: 'api.example.com, cdn.example.com',
      hint: 'Default: supabase.co, lenserfight.com, cdn.',
      tooltip: {
        summary: 'Additional domains the file reader is allowed to fetch from, beyond the built-in defaults.',
        format: 'Comma-separated domain names (e.g. api.example.com, cdn.mysite.com).',
        executionImpact: 'URLs pointing to unlisted domains are rejected at runtime with a security error.',
      },
    },
  ],
  outputFields: [
    { key: 'content', type: 'string', description: 'File content' },
    { key: 'mimeType', type: 'string', description: 'Detected MIME type' },
    { key: 'bytes', type: 'number', description: 'Content size in bytes' },
  ],
}

export const fileWriterDescriptor: RunnerConfigDescriptor = {
  nodeType: 'file_writer',
  displayName: 'File Writer',
  category: 'storage',
  fields: [
    {
      key: 'destination',
      label: 'Destination',
      type: 'select',
      required: true,
      defaultValue: 'object-storage',
      options: [
        { value: 'object-storage', label: 'Object Storage' },
        { value: 'download', label: 'Run Artifact Download' },
      ],
      hint: 'Where the generated file should be written.',
      tooltip: {
        summary: 'Where the file is persisted. Object Storage writes to Supabase storage. Run Artifact creates a downloadable attachment on the workflow run.',
        executionImpact: 'Object Storage files persist until deleted. Run Artifact files are tied to the run lifecycle.',
      },
    },
    {
      key: 'bucket',
      label: 'Bucket',
      type: 'text',
      defaultValue: 'workflow-outputs',
      placeholder: 'workflow-outputs',
      tooltip: {
        summary: 'The Supabase storage bucket to write the file into.',
        format: 'Bucket name string. Must already exist in Supabase storage.',
        whenRequired: 'Required when destination is Object Storage.',
      },
    },
    {
      key: 'objectKeyTemplate',
      label: 'Object Key Template',
      type: 'text',
      required: true,
      defaultValue: 'digests/{{runId}}.md',
      placeholder: 'digests/{{runId}}.md',
      mono: true,
      hint: 'Supports run and upstream template variables.',
      tooltip: {
        summary: 'The path/filename for the stored file within the bucket.',
        format: 'Path string with {{variable}} support. e.g. digests/{{runId}}.md, exports/{{ctx.date}}/report.json.',
        commonMistakes: 'Hardcoding the key without {{runId}}, which causes files from different runs to overwrite each other.',
      },
    },
    {
      key: 'contentPath',
      label: 'Content Mapping',
      type: 'text',
      defaultValue: '$.summary',
      placeholder: '$.summary',
      mono: true,
      hint: 'JSON path or mapping that provides file content.',
      tooltip: {
        summary: 'A JSON path expression that selects which part of the upstream output becomes the file content.',
        format: 'JSONPath expression (e.g. $.summary, $.data.text). Use $ for the entire upstream output.',
        commonMistakes: 'Pointing to an object instead of a string, which writes [object Object] to the file.',
      },
    },
    {
      key: 'mimeType',
      label: 'MIME Type',
      type: 'text',
      defaultValue: 'text/markdown',
      placeholder: 'text/markdown',
      tooltip: {
        summary: 'The content type of the written file.',
        format: 'Standard MIME type (e.g. text/markdown, application/json, text/csv).',
        executionImpact: 'Sets the Content-Type header for downloads and browser rendering.',
      },
    },
  ],
  outputFields: [
    { key: 'file.url', type: 'string', description: 'Written file URL or artifact reference' },
    { key: 'file.mimeType', type: 'string', description: 'Written file MIME type' },
    { key: 'objectKey', type: 'string', description: 'Storage object key' },
  ],
}

export const webhookTriggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'webhook_trigger',
  displayName: 'Webhook Trigger',
  category: 'storage',
  fields: [
    {
      key: 'secret',
      label: 'Webhook Secret',
      type: 'text',
      required: true,
      placeholder: 'min 16 characters',
      mono: true,
      hint: 'HMAC validation secret. Min 16 characters.',
      tooltip: {
        summary: 'HMAC secret used to validate incoming webhook payloads.',
        whenRequired: 'Always required — prevents unauthorized triggers.',
        format: 'String, minimum 16 characters. Use a cryptographically random value.',
        commonMistakes: 'Using short or predictable secrets. Sharing the secret in public repos.',
        executionImpact: 'Incoming requests are verified with HMAC-SHA256. Invalid signatures are rejected with 401.',
      },
      validate: (v) => (v && v.length < 16 ? 'Secret must be at least 16 characters' : null),
    },
  ],
  outputFields: [
    { key: 'registered', type: 'boolean', description: 'Whether webhook was registered' },
    { key: 'webhookUrl', type: 'string', description: 'Generated webhook URL' },
  ],
}

export const webhookSenderDescriptor: RunnerConfigDescriptor = {
  nodeType: 'webhook_sender',
  displayName: 'Webhook Sender',
  category: 'storage',
  fields: [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      required: true,
      placeholder: 'https://api.example.com/webhook',
      tooltip: {
        summary: 'The endpoint URL to send the webhook request to.',
        format: 'Full HTTPS URL. Supports {{variable}} interpolation.',
        commonMistakes: 'Using HTTP instead of HTTPS. Forgetting to include the path (e.g. just the domain without /webhook).',
      },
    },
    {
      key: 'method',
      label: 'HTTP Method',
      type: 'select',
      defaultValue: 'POST',
      options: [
        { value: 'GET', label: 'GET' },
        { value: 'POST', label: 'POST' },
        { value: 'PUT', label: 'PUT' },
        { value: 'PATCH', label: 'PATCH' },
        { value: 'DELETE', label: 'DELETE' },
      ],
      tooltip: {
        summary: 'The HTTP method for the outgoing webhook request.',
        commonMistakes: 'Using GET when the receiver expects POST. GET requests do not include a body.',
      },
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'key_value',
      placeholder: 'Header name',
      hint: 'HTTP headers. Values support {{expression}} syntax.',
      tooltip: {
        summary: 'Custom HTTP headers to include in the webhook request.',
        format: 'Key-value pairs. Keys are header names, values support {{expression}} syntax.',
        commonMistakes: 'Putting secrets directly in header values instead of using {{secrets.TOKEN}} syntax.',
      },
    },
    {
      key: 'bodyTemplate',
      label: 'Body Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
      tooltip: {
        summary: 'The request body content. Defaults to the full upstream output JSON if left empty.',
        format: 'Free-form text or JSON. Use {{nodeId.field}} for interpolation.',
      },
    },
    {
      key: 'retries',
      label: 'Retries',
      type: 'number',
      defaultValue: '3',
      min: 0,
      max: 10,
      tooltip: {
        summary: 'Number of retry attempts if the webhook request fails (non-2xx response or timeout).',
        format: 'Integer between 0 and 10.',
        executionImpact: 'Retries use exponential backoff. Higher values increase resilience but extend the node execution time on failures.',
      },
    },
  ],
  outputFields: [
    { key: 'sent', type: 'boolean', description: 'Whether request was dispatched' },
    { key: 'statusCode', type: 'number', description: 'HTTP response status' },
  ],
}

export const scheduleTriggerDescriptor: RunnerConfigDescriptor = {
  nodeType: 'schedule_trigger',
  displayName: 'Schedule Trigger',
  category: 'storage',
  fields: [
    {
      key: 'cronExpression',
      label: 'Cron Expression (5-field)',
      type: 'text',
      required: true,
      placeholder: '*/15 * * * *',
      mono: true,
      hint: 'Min interval: every 5 minutes (*/5 * * * *).',
      tooltip: {
        summary: 'A cron schedule expression that defines when the workflow runs automatically.',
        format: '5-field cron: minute hour day-of-month month day-of-week. e.g. */15 * * * * = every 15 minutes.',
        commonMistakes: 'Using 6-field cron (with seconds), which is not supported. Setting intervals below 5 minutes, which is rejected.',
        executionImpact: 'Each trigger creates a new workflow run. Very frequent schedules accumulate execution costs.',
      },
    },
    {
      key: 'timezone',
      label: 'Timezone',
      type: 'text',
      defaultValue: 'UTC',
      placeholder: 'UTC',
      tooltip: {
        summary: 'The timezone used to interpret the cron expression.',
        format: 'IANA timezone name (e.g. UTC, Europe/Istanbul, America/New_York).',
        commonMistakes: 'Using abbreviations like EST or CET, which are ambiguous. Use full IANA names.',
      },
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether the schedule is actively firing. Set to false to pause without deleting.',
        executionImpact: 'When false, no runs are triggered. The schedule is preserved and can be re-enabled later.',
      },
    },
  ],
  outputFields: [
    { key: 'scheduled', type: 'boolean', description: 'Whether schedule was registered' },
    { key: 'nextRun', type: 'string', description: 'Next scheduled execution time' },
  ],
}
