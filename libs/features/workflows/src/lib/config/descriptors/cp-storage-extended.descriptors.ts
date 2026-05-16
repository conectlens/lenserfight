/**
 * CP — Storage Extended node config descriptors.
 *
 * Covers: sql_query, object_storage_upload, object_storage_download,
 *         http_request, graphql_request.
 */

import type { RunnerConfigDescriptor } from '../../types'

export const sqlQueryDescriptor: RunnerConfigDescriptor = {
  nodeType: 'sql_query',
  displayName: 'SQL Query',
  category: 'storage',
  banner: {
    text: 'Only read-only queries. Write operations are blocked.',
    variant: 'warning',
  },
  fields: [
    {
      key: 'query',
      label: 'SQL Query',
      type: 'code',
      required: true,
      rows: 4,
      mono: true,
      hint: 'Use $1, $2 for parameters.',
    },
    {
      key: 'params',
      label: 'Query Parameters',
      type: 'json',
      hint: 'Array of parameter values.',
    },
    {
      key: 'maxRows',
      label: 'Max Rows',
      type: 'number',
      defaultValue: '100',
      min: 1,
      max: 1000,
    },
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: '5000',
      min: 1000,
      max: 30000,
    },
  ],
  outputFields: [
    { key: 'rows', type: 'array', description: 'Query result rows' },
    { key: 'rowCount', type: 'number', description: 'Number of rows returned' },
  ],
}

export const objectStorageUploadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'object_storage_upload',
  displayName: 'Object Storage Upload',
  category: 'storage',
  fields: [
    {
      key: 'bucket',
      label: 'Bucket',
      type: 'text',
      required: true,
    },
    {
      key: 'path',
      label: 'Path',
      type: 'text',
      required: true,
      mono: true,
      hint: 'Supports {{ctx.runId}} template.',
    },
    {
      key: 'contentType',
      label: 'Content Type',
      type: 'text',
      placeholder: 'e.g. application/json',
    },
    {
      key: 'visibility',
      label: 'Visibility',
      type: 'select',
      defaultValue: 'private',
      options: [
        { label: 'Public', value: 'public' },
        { label: 'Private', value: 'private' },
      ],
    },
    {
      key: 'upsert',
      label: 'Upsert',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'url', type: 'string', description: 'Uploaded object URL' },
    { key: 'path', type: 'string', description: 'Final storage path' },
  ],
}

export const objectStorageDownloadDescriptor: RunnerConfigDescriptor = {
  nodeType: 'object_storage_download',
  displayName: 'Object Storage Download',
  category: 'storage',
  fields: [
    {
      key: 'bucket',
      label: 'Bucket',
      type: 'text',
      required: true,
    },
    {
      key: 'path',
      label: 'Path',
      type: 'text',
      required: true,
      mono: true,
    },
    {
      key: 'signedUrlExpiry',
      label: 'Signed URL Expiry (seconds)',
      type: 'number',
      defaultValue: '3600',
      min: 60,
      max: 86400,
      hint: 'Seconds.',
    },
  ],
  outputFields: [
    { key: 'signedUrl', type: 'string', description: 'Signed download URL' },
    { key: 'metadata', type: 'object', description: 'Object metadata' },
  ],
}

export const httpRequestDescriptor: RunnerConfigDescriptor = {
  nodeType: 'http_request',
  displayName: 'HTTP Request',
  category: 'storage',
  fields: [
    {
      key: 'url',
      label: 'URL',
      type: 'text',
      required: true,
    },
    {
      key: 'method',
      label: 'Method',
      type: 'select',
      required: true,
      defaultValue: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
        { label: 'PUT', value: 'PUT' },
        { label: 'PATCH', value: 'PATCH' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'json',
    },
    {
      key: 'body',
      label: 'Body',
      type: 'json',
    },
    {
      key: 'auth',
      label: 'Auth',
      type: 'select',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Bearer Token', value: 'bearer' },
        { label: 'Basic Auth', value: 'basic' },
      ],
    },
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: '10000',
      min: 1000,
      max: 60000,
    },
    {
      key: 'retries',
      label: 'Retries',
      type: 'number',
      defaultValue: '2',
      min: 0,
      max: 5,
    },
    {
      key: 'followRedirects',
      label: 'Follow Redirects',
      type: 'boolean',
      defaultValue: 'true',
    },
  ],
  outputFields: [
    { key: 'status', type: 'number', description: 'HTTP status code' },
    { key: 'body', type: 'unknown', description: 'Response body' },
    { key: 'headers', type: 'object', description: 'Response headers' },
  ],
}

export const graphqlRequestDescriptor: RunnerConfigDescriptor = {
  nodeType: 'graphql_request',
  displayName: 'GraphQL Request',
  category: 'storage',
  fields: [
    {
      key: 'endpoint',
      label: 'Endpoint',
      type: 'text',
      required: true,
    },
    {
      key: 'query',
      label: 'Query',
      type: 'code',
      required: true,
      rows: 6,
      mono: true,
    },
    {
      key: 'variables',
      label: 'Variables',
      type: 'json',
    },
    {
      key: 'operationName',
      label: 'Operation Name',
      type: 'text',
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'json',
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'GraphQL response data' },
    { key: 'errors', type: 'array', description: 'GraphQL errors if any' },
  ],
}
