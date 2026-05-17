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
      tooltip: {
        summary: 'The read-only SQL query to execute against the database.',
        format: 'Standard SQL SELECT statement. Use $1, $2, etc. for parameterized values.',
        commonMistakes: 'Attempting INSERT/UPDATE/DELETE, which is blocked. Forgetting to parameterize user input, which is rejected.',
        executionImpact: 'Runs in a read-only transaction with the configured timeout. Complex queries may hit the timeout limit.',
      },
    },
    {
      key: 'params',
      label: 'Query Parameters',
      type: 'json',
      hint: 'Array of parameter values.',
      tooltip: {
        summary: 'Positional parameters for the SQL query, mapped to $1, $2, etc.',
        format: 'JSON array of values (e.g. ["value1", 42, true]). Order must match $N placeholders.',
        commonMistakes: 'Providing an object instead of an array. Mismatching parameter count with $N placeholders.',
      },
    },
    {
      key: 'maxRows',
      label: 'Max Rows',
      type: 'number',
      defaultValue: '100',
      min: 1,
      max: 1000,
      tooltip: {
        summary: 'Maximum number of rows returned from the query. Acts as a LIMIT on the result set.',
        format: 'Integer between 1 and 1000.',
        executionImpact: 'The query runs fully but output is truncated. Use SQL LIMIT for efficient queries on large tables.',
      },
    },
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: '5000',
      min: 1000,
      max: 30000,
      tooltip: {
        summary: 'Maximum time the query is allowed to run before being cancelled.',
        format: 'Integer in milliseconds. 5000 = 5 seconds.',
        executionImpact: 'Queries exceeding this limit are killed and the node fails. Increase for complex joins or large scans.',
      },
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
      tooltip: {
        summary: 'The Supabase storage bucket to upload the file into.',
        format: 'Bucket name string. Must already exist.',
      },
    },
    {
      key: 'path',
      label: 'Path',
      type: 'text',
      required: true,
      mono: true,
      hint: 'Supports {{ctx.runId}} template.',
      tooltip: {
        summary: 'The object path (including filename) within the bucket.',
        format: 'Path string with optional {{ctx.runId}} or {{variable}} interpolation.',
        commonMistakes: 'Omitting a file extension, which makes the file harder to identify later.',
      },
    },
    {
      key: 'contentType',
      label: 'Content Type',
      type: 'text',
      placeholder: 'e.g. application/json',
      tooltip: {
        summary: 'The MIME type of the uploaded content. Auto-detected from the file extension if omitted.',
        format: 'Standard MIME type (e.g. application/json, image/png, text/csv).',
      },
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
      tooltip: {
        summary: 'Whether the uploaded file is publicly accessible or requires authentication.',
        executionImpact: 'Public files get a permanent URL. Private files require a signed URL for access.',
      },
    },
    {
      key: 'upsert',
      label: 'Upsert',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to overwrite an existing file at the same path or fail if it already exists.',
        executionImpact: 'When true, existing files are silently overwritten. When false, uploading to an existing path causes an error.',
      },
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
      tooltip: {
        summary: 'The Supabase storage bucket containing the file to download.',
        format: 'Bucket name string.',
      },
    },
    {
      key: 'path',
      label: 'Path',
      type: 'text',
      required: true,
      mono: true,
      tooltip: {
        summary: 'The object path within the bucket to download.',
        format: 'Path string. Supports {{variable}} interpolation.',
        commonMistakes: 'Including the bucket name in the path (the bucket field already specifies it).',
      },
    },
    {
      key: 'signedUrlExpiry',
      label: 'Signed URL Expiry (seconds)',
      type: 'number',
      defaultValue: '3600',
      min: 60,
      max: 86400,
      hint: 'Seconds.',
      tooltip: {
        summary: 'How long the generated signed download URL remains valid.',
        format: 'Integer in seconds. 3600 = 1 hour, 86400 = 24 hours (maximum).',
        executionImpact: 'After expiry, the URL returns 403 Forbidden. Generate a new one by re-running the node.',
      },
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
      tooltip: {
        summary: 'The full URL to send the HTTP request to.',
        format: 'Complete URL with protocol (e.g. https://api.example.com/v1/data). Supports {{variable}} interpolation.',
      },
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
      tooltip: {
        summary: 'The HTTP method for the request.',
        commonMistakes: 'Using GET with a body, which is ignored by most servers.',
      },
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'key_value',
      placeholder: 'Header name',
      hint: 'HTTP request headers. Values support {{expression}} syntax.',
      tooltip: {
        summary: 'Custom HTTP headers included in the request.',
        format: 'Key-value pairs. Content-Type is auto-set for JSON bodies if not specified.',
      },
    },
    {
      key: 'body',
      label: 'Body',
      type: 'json',
      tooltip: {
        summary: 'The request body, sent as JSON. Only used for POST, PUT, and PATCH methods.',
        format: 'Valid JSON object or array.',
        commonMistakes: 'Providing a body for GET or DELETE requests, which is ignored.',
      },
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
      tooltip: {
        summary: 'Authentication method. Bearer adds an Authorization header. Basic Auth encodes credentials.',
        executionImpact: 'When Bearer or Basic is selected, credentials are resolved from the workflow secret store at runtime.',
      },
    },
    {
      key: 'timeoutMs',
      label: 'Timeout (ms)',
      type: 'number',
      defaultValue: '10000',
      min: 1000,
      max: 60000,
      tooltip: {
        summary: 'Maximum time to wait for a response before the request is aborted.',
        format: 'Integer in milliseconds. 10000 = 10 seconds.',
        executionImpact: 'Requests exceeding this limit are cancelled and the node fails.',
      },
    },
    {
      key: 'retries',
      label: 'Retries',
      type: 'number',
      defaultValue: '2',
      min: 0,
      max: 5,
      tooltip: {
        summary: 'Number of retry attempts for failed requests (5xx errors or timeouts).',
        format: 'Integer between 0 and 5.',
        executionImpact: 'Uses exponential backoff between retries. 4xx errors are not retried.',
      },
    },
    {
      key: 'followRedirects',
      label: 'Follow Redirects',
      type: 'boolean',
      defaultValue: 'true',
      tooltip: {
        summary: 'Whether to automatically follow HTTP 3xx redirects.',
        executionImpact: 'When false, a 301/302 response is returned as-is. When true, up to 5 redirects are followed.',
      },
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
      tooltip: {
        summary: 'The GraphQL API endpoint URL.',
        format: 'Full HTTPS URL (e.g. https://api.example.com/graphql).',
      },
    },
    {
      key: 'query',
      label: 'Query',
      type: 'code',
      required: true,
      rows: 6,
      mono: true,
      tooltip: {
        summary: 'The GraphQL query or mutation to execute.',
        format: 'Standard GraphQL syntax. Use $varName for variables defined in the Variables field.',
        commonMistakes: 'Forgetting to declare variables in the query signature (e.g. query($id: ID!) { ... }).',
      },
    },
    {
      key: 'variables',
      label: 'Variables',
      type: 'key_value',
      placeholder: 'Variable name',
      hint: 'GraphQL query variables. Values support {{expression}} syntax.',
      tooltip: {
        summary: 'Variables passed to the GraphQL query. Keys must match the $varName declarations in the query.',
        format: 'Key-value pairs. Values support {{expression}} syntax for dynamic data.',
      },
    },
    {
      key: 'operationName',
      label: 'Operation Name',
      type: 'text',
      tooltip: {
        summary: 'The name of the operation to execute when the query contains multiple named operations.',
        whenRequired: 'Required when the query string contains more than one named operation.',
      },
    },
    {
      key: 'headers',
      label: 'Headers',
      type: 'key_value',
      placeholder: 'Header name',
      tooltip: {
        summary: 'Custom HTTP headers for the GraphQL request (e.g. Authorization, X-API-Key).',
        format: 'Key-value pairs. Values support {{expression}} syntax.',
      },
    },
  ],
  outputFields: [
    { key: 'data', type: 'object', description: 'GraphQL response data' },
    { key: 'errors', type: 'array', description: 'GraphQL errors if any' },
  ],
}
