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
    },
    {
      key: 'params',
      label: 'Parameters (JSON)',
      type: 'json',
      rows: 4,
      placeholder: '{ "p_lenser_id": "{{n1.lenserId}}" }',
      hint: 'JSON object passed as RPC parameters.',
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
    },
    {
      key: 'value',
      label: 'Value (optional)',
      type: 'textarea',
      rows: 3,
      placeholder: 'Defaults to upstream output text',
      hint: 'Max 1MB.',
    },
    {
      key: 'ttlMs',
      label: 'TTL (ms)',
      type: 'number',
      defaultValue: '86400000',
      min: 1000,
      max: 86400000,
      hint: 'Max 24 hours (86,400,000ms).',
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
    },
    {
      key: 'allowedDomains',
      label: 'Additional Allowed Domains (comma-separated)',
      type: 'text',
      placeholder: 'api.example.com, cdn.example.com',
      hint: 'Default: supabase.co, lenserfight.com, cdn.',
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
    },
    {
      key: 'bucket',
      label: 'Bucket',
      type: 'text',
      defaultValue: 'workflow-outputs',
      placeholder: 'workflow-outputs',
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
    },
    {
      key: 'contentPath',
      label: 'Content Mapping',
      type: 'text',
      defaultValue: '$.summary',
      placeholder: '$.summary',
      mono: true,
      hint: 'JSON path or mapping that provides file content.',
    },
    {
      key: 'mimeType',
      label: 'MIME Type',
      type: 'text',
      defaultValue: 'text/markdown',
      placeholder: 'text/markdown',
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
    },
    {
      key: 'headers',
      label: 'Headers (JSON, optional)',
      type: 'json',
      rows: 3,
      placeholder: '{ "Authorization": "Bearer {{token}}" }',
    },
    {
      key: 'bodyTemplate',
      label: 'Body Template (optional)',
      type: 'textarea',
      rows: 4,
      placeholder: 'Defaults to upstream output. Use {{var}} for interpolation.',
    },
    {
      key: 'retries',
      label: 'Retries',
      type: 'number',
      defaultValue: '3',
      min: 0,
      max: 10,
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
    },
    {
      key: 'timezone',
      label: 'Timezone',
      type: 'text',
      defaultValue: 'UTC',
      placeholder: 'UTC',
    },
    {
      key: 'enabled',
      label: 'Enabled',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'scheduled', type: 'boolean', description: 'Whether schedule was registered' },
    { key: 'nextRun', type: 'string', description: 'Next scheduled execution time' },
  ],
}
