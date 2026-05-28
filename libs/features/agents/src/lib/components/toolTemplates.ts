import type { ToolAuthMethod } from '@lenserfight/types'

export interface ToolTemplatePreset {
  id: string
  label: string
  summary: string
  key: string
  name: string
  description: string
  category: string
  auth_method: ToolAuthMethod
  requires_approval: boolean
  is_dangerous: boolean
  schema_input: Record<string, unknown>
  schema_output: Record<string, unknown>
  tags: string[]
}

export const TOOL_TEMPLATE_PRESETS: ToolTemplatePreset[] = [
  {
    id: 'web-search',
    label: 'Web Search',
    summary: 'Search the public web and return ranked results.',
    key: 'search.web',
    name: 'Web Search',
    description:
      'Queries a web search provider and returns ranked result snippets with source URLs.',
    category: 'research',
    auth_method: 'api_key',
    requires_approval: false,
    is_dangerous: false,
    schema_input: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Search query text.' },
        locale: { type: 'string' },
        max_results: { type: 'integer', minimum: 1, maximum: 25, default: 5 },
      },
    },
    schema_output: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              url: { type: 'string' },
              snippet: { type: 'string' },
            },
          },
        },
      },
    },
    tags: ['research', 'safe', 'search'],
  },
  {
    id: 'http-fetch',
    label: 'HTTP Fetch',
    summary: 'Fetch a URL and return structured response metadata.',
    key: 'http.fetch',
    name: 'HTTP Fetch',
    description:
      'Performs a network fetch against an allowed URL and returns status, headers, and body text.',
    category: 'integration',
    auth_method: 'api_key',
    requires_approval: true,
    is_dangerous: true,
    schema_input: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', format: 'uri' },
        method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'GET' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        body: {},
      },
    },
    schema_output: {
      type: 'object',
      properties: {
        status: { type: 'integer' },
        headers: { type: 'object', additionalProperties: { type: 'string' } },
        body: { type: 'string' },
      },
    },
    tags: ['network', 'approval', 'dangerous'],
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge Base',
    summary: 'Search an internal document corpus and return citations.',
    key: 'kb.search',
    name: 'Knowledge Base Search',
    description:
      'Searches an internal knowledge corpus and returns grounded excerpts with document citations.',
    category: 'knowledge',
    auth_method: 'service_account',
    requires_approval: false,
    is_dangerous: false,
    schema_input: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string' },
        top_k: { type: 'integer', minimum: 1, maximum: 20, default: 5 },
        filters: { type: 'object', additionalProperties: true },
      },
    },
    schema_output: {
      type: 'object',
      properties: {
        matches: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              excerpt: { type: 'string' },
              citation: { type: 'string' },
              score: { type: 'number' },
            },
          },
        },
      },
    },
    tags: ['knowledge', 'rag', 'grounded'],
  },
  {
    id: 'webhook-dispatch',
    label: 'Webhook',
    summary: 'Send structured events to an external webhook.',
    key: 'webhook.dispatch',
    name: 'Webhook Dispatch',
    description:
      'Dispatches a structured payload to a configured webhook endpoint for downstream automation.',
    category: 'automation',
    auth_method: 'oauth',
    requires_approval: true,
    is_dangerous: true,
    schema_input: {
      type: 'object',
      required: ['endpoint', 'payload'],
      properties: {
        endpoint: { type: 'string', format: 'uri' },
        event_name: { type: 'string' },
        payload: { type: 'object', additionalProperties: true },
      },
    },
    schema_output: {
      type: 'object',
      properties: {
        accepted: { type: 'boolean' },
        request_id: { type: 'string' },
      },
    },
    tags: ['automation', 'approval', 'delivery'],
  },
]
