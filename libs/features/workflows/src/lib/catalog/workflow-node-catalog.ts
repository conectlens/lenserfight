/**
 * WorkflowNodeCatalog — GRASP Information Expert + Registry.
 *
 * Single source of truth for all workflow node types. Every consumer
 * (palette, docs panel, edge validation, templates, export, command search)
 * reads from this catalog instead of duplicating metadata.
 *
 * Adding a new node type: add one entry in the matching nodes/*.catalog.ts
 * file — all UI surfaces update automatically.
 */

import {
  TRIGGER_NODES,
  LOGIC_NEW_NODES,
  DATA_NEW_NODES,
  AI_NEW_NODES,
  BATTLE_NODES,
  STORAGE_NEW_NODES,
  COMMUNICATION_NEW_NODES,
  INTEGRATION_NEW_NODES,
  MEDIA_NODES,
  UTILITY_NODES,
} from './nodes'

export type NodeCategory =
  | 'lens' | 'logic' | 'data' | 'ai_primitive' | 'storage'
  | 'communication' | 'integration'
  | 'trigger' | 'battle' | 'media' | 'utility'

export type NodeIOType =
  | 'text' | 'json' | 'array' | 'number' | 'boolean' | 'binary' | 'any' | 'void'
  | 'object' | 'image' | 'audio' | 'video' | 'file' | 'embedding'
  | 'document[]' | 'battle_result' | 'lens_result' | 'agent_result'
  | 'workflow_result' | 'error'

export interface NodeSchemaField {
  name: string
  type: NodeIOType
  required?: boolean
  description?: string
}

export interface CatalogNodeEntry {
  /** Unique node type key matching WorkflowNodeType and canvas node_type */
  type: string
  /** Human-readable display name */
  label: string
  /** Short description (1 sentence) */
  description: string
  /** Category for grouping in palette */
  category: NodeCategory
  /** Color class for accent (Tailwind) */
  color: string
  /** Lucide icon name (used by palette/canvas) */
  iconName: string
  /** Input schema — what this node expects from upstream */
  inputs: NodeSchemaField[]
  /** Output schema — what this node produces */
  outputs: NodeSchemaField[]
  /** Required config fields */
  requiredConfig: string[]
  /** Optional config fields */
  optionalConfig: string[]
  /** Example config (for docs and templates) */
  exampleConfig: Record<string, unknown>
  /** Compatible output types this node can receive */
  acceptsInputTypes: NodeIOType[]
  /** Output type this node produces */
  producesOutputType: NodeIOType
  /** n8n equivalent node name (for export mapping) */
  n8nEquivalent?: string
  /** Documentation link path */
  docsPath?: string
}

// ── The Catalog ──────────────────────────────────────────────────────────────

export const WORKFLOW_NODE_CATALOG: CatalogNodeEntry[] = [
  // ── Lens (default AI node) ─────────────────────────────────────────────
  {
    type: 'lens',
    label: 'Lens',
    description: 'Execute an AI model through a LenserFight Lens prompt template.',
    category: 'lens',
    color: 'text-primary-yellow-600',
    iconName: 'Sparkles',
    inputs: [{ name: 'input', type: 'text', required: true, description: 'Prompt input text' }],
    outputs: [{ name: 'text', type: 'text', description: 'Generated text output' }],
    requiredConfig: ['model_id'],
    optionalConfig: ['param_overrides', 'funding_source'],
    exampleConfig: { model_id: 'claude-sonnet-4-6' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'text',
    n8nEquivalent: 'n8n-nodes-base.openAi',
    docsPath: '/en/explanation/lenses/workflows',
  },

  // ── CN: Logic ──────────────────────────────────────────────────────────
  {
    type: 'code',
    label: 'Code',
    description: 'Execute sandboxed JavaScript on upstream data.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'Code2',
    inputs: [{ name: 'input', type: 'any', description: 'Upstream outputs as JSON' }],
    outputs: [{ name: 'result', type: 'any', description: 'Code return value' }],
    requiredConfig: ['code'],
    optionalConfig: ['timeoutMs'],
    exampleConfig: { code: 'input.n1.count * 2', timeoutMs: 5000 },
    acceptsInputTypes: ['text', 'json', 'array', 'number', 'any'],
    producesOutputType: 'any',
    n8nEquivalent: 'n8n-nodes-base.code',
  },
  {
    type: 'switch',
    label: 'Switch',
    description: 'Route execution to different branches based on conditions.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'Split',
    inputs: [{ name: 'input', type: 'any', description: 'Value to evaluate' }],
    outputs: [{ name: 'branch', type: 'text', description: 'Matched branch label' }],
    requiredConfig: ['cases'],
    optionalConfig: ['inputPath', 'defaultBranch'],
    exampleConfig: { cases: [{ label: 'success', operator: 'equals', value: 'ok', expression: '' }], defaultBranch: 'fallback' },
    acceptsInputTypes: ['text', 'json', 'number', 'any'],
    producesOutputType: 'text',
    n8nEquivalent: 'n8n-nodes-base.switch',
  },
  {
    type: 'loop_map',
    label: 'Loop / Map',
    description: 'Iterate over an array, emitting each item for downstream processing.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'Repeat',
    inputs: [{ name: 'array', type: 'array', required: true, description: 'Array to iterate' }],
    outputs: [{ name: 'items', type: 'array', description: 'Processed items' }],
    requiredConfig: [],
    optionalConfig: ['arrayPath', 'itemVariable', 'maxItems'],
    exampleConfig: { arrayPath: 'results.items', itemVariable: 'item', maxItems: 100 },
    acceptsInputTypes: ['array', 'json', 'any'],
    producesOutputType: 'array',
    n8nEquivalent: 'n8n-nodes-base.splitInBatches',
  },
  {
    type: 'wait_delay',
    label: 'Wait / Delay',
    description: 'Pause execution for a configured duration.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'Clock',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the wait' }],
    outputs: [{ name: 'completed', type: 'text', description: 'Confirmation after delay' }],
    requiredConfig: [],
    optionalConfig: ['delayMs', 'delayUntil'],
    exampleConfig: { delayMs: 5000 },
    acceptsInputTypes: ['text', 'json', 'any', 'void'],
    producesOutputType: 'text',
    n8nEquivalent: 'n8n-nodes-base.wait',
  },
  {
    type: 'error_catch',
    label: 'Error Catch',
    description: 'Catch errors from upstream nodes and provide a fallback path.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'AlertTriangle',
    inputs: [{ name: 'error', type: 'json', description: 'Error context from failed node' }],
    outputs: [{ name: 'recovery', type: 'json', description: 'Error details + fallback value' }],
    requiredConfig: [],
    optionalConfig: ['fallbackValue', 'continueOnError'],
    exampleConfig: { fallbackValue: 'Default response', continueOnError: true },
    acceptsInputTypes: ['any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.errorTrigger',
  },
  {
    type: 'sub_workflow',
    label: 'Sub-Workflow',
    description: 'Invoke another workflow as a reusable building block.',
    category: 'logic',
    color: 'text-violet-500',
    iconName: 'Workflow',
    inputs: [{ name: 'inputs', type: 'json', description: 'Mapped inputs for the sub-workflow' }],
    outputs: [{ name: 'result', type: 'any', description: 'Sub-workflow final output' }],
    requiredConfig: ['workflowId'],
    optionalConfig: ['inputMapping', 'maxDepth'],
    exampleConfig: { workflowId: '12345678-1234-1234-1234-123456789abc', inputMapping: { query: 'n1.text' } },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'any',
    n8nEquivalent: 'n8n-nodes-base.executeWorkflow',
  },

  // ── CN: Data ───────────────────────────────────────────────────────────
  {
    type: 'json_transform',
    label: 'JSON Transform',
    description: 'Extract a value from upstream JSON using dot-notation path.',
    category: 'data',
    color: 'text-sky-500',
    iconName: 'Braces',
    inputs: [{ name: 'data', type: 'json', required: true, description: 'JSON object to query' }],
    outputs: [{ name: 'value', type: 'any', description: 'Extracted value' }],
    requiredConfig: ['expression'],
    optionalConfig: ['sourceNodeId'],
    exampleConfig: { expression: 'items[0].name' },
    acceptsInputTypes: ['json', 'text', 'any'],
    producesOutputType: 'any',
    n8nEquivalent: 'n8n-nodes-base.set',
  },
  {
    type: 'set_variables',
    label: 'Set Variables',
    description: 'Define or override workflow-scoped variables for downstream nodes.',
    category: 'data',
    color: 'text-sky-500',
    iconName: 'Variable',
    inputs: [{ name: 'context', type: 'any', description: 'Optional upstream context' }],
    outputs: [{ name: 'variables', type: 'json', description: 'Set variable key-value pairs' }],
    requiredConfig: ['variables'],
    optionalConfig: [],
    exampleConfig: { variables: { apiUrl: 'https://api.example.com', retries: '3' } },
    acceptsInputTypes: ['text', 'json', 'any', 'void'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.set',
  },

  // ── CO: AI Primitives ──────────────────────────────────────────────────
  {
    type: 'prompt_template',
    label: 'Prompt Template',
    description: 'Compose dynamic prompts from a template with variable interpolation.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'FileText',
    inputs: [{ name: 'variables', type: 'any', description: 'Variable values from upstream' }],
    outputs: [{ name: 'prompt', type: 'text', description: 'Rendered prompt string' }],
    requiredConfig: ['template'],
    optionalConfig: ['variables'],
    exampleConfig: { template: 'Write about {{topic}} for {{audience}}' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'text',
    n8nEquivalent: 'n8n-nodes-base.set',
  },
  {
    type: 'output_parser',
    label: 'Output Parser',
    description: 'Extract structured JSON from LLM text output.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'Braces',
    inputs: [{ name: 'text', type: 'text', required: true, description: 'LLM text to parse' }],
    outputs: [{ name: 'parsed', type: 'json', description: 'Extracted structured data' }],
    requiredConfig: [],
    optionalConfig: ['fields', 'jsonPath', 'strict'],
    exampleConfig: { fields: ['name', 'score', 'reasoning'], strict: true },
    acceptsInputTypes: ['text'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.code',
  },
  {
    type: 'embedding',
    label: 'Embedding',
    description: 'Prepare text for vector embedding generation.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'BrainCircuit',
    inputs: [{ name: 'text', type: 'text', required: true, description: 'Text to embed' }],
    outputs: [{ name: 'embedding', type: 'array', description: 'Embedding request envelope' }],
    requiredConfig: [],
    optionalConfig: ['inputField', 'dimensions'],
    exampleConfig: { dimensions: 1536 },
    acceptsInputTypes: ['text', 'json'],
    producesOutputType: 'array',
    n8nEquivalent: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
  },
  {
    type: 'rag_retrieval',
    label: 'RAG Retrieval',
    description: 'Query memory or vector store for relevant context chunks.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'Search',
    inputs: [{ name: 'query', type: 'text', description: 'Search query' }],
    outputs: [{ name: 'chunks', type: 'array', description: 'Retrieved context chunks' }],
    requiredConfig: [],
    optionalConfig: ['query', 'topK', 'lenserId', 'minScore'],
    exampleConfig: { topK: 5, minScore: 0.7 },
    acceptsInputTypes: ['text', 'any'],
    producesOutputType: 'array',
    n8nEquivalent: '@n8n/n8n-nodes-langchain.vectorStoreRetriever',
  },
  {
    type: 'judge_evaluator',
    label: 'Judge / Evaluator',
    description: 'Compare upstream outputs against a rubric for competitive evaluation.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'Scale',
    inputs: [{ name: 'entries', type: 'text', required: true, description: 'Two or more outputs to compare' }],
    outputs: [{ name: 'verdict', type: 'json', description: 'Structured judge prompt with rubric' }],
    requiredConfig: [],
    optionalConfig: ['rubric', 'comparisonMode', 'sourceNodeIds', 'maxScore'],
    exampleConfig: { rubric: 'Evaluate creativity, accuracy, and depth', comparisonMode: 'pairwise', maxScore: 10 },
    acceptsInputTypes: ['text', 'any'],
    producesOutputType: 'text',
  },
  {
    type: 'memory_read',
    label: 'Memory Read',
    description: 'Read a stored value from lenser memory by key.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'BookOpen',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the read' }],
    outputs: [{ name: 'value', type: 'any', description: 'Stored memory value' }],
    requiredConfig: ['key'],
    optionalConfig: ['lenserId'],
    exampleConfig: { key: 'session_context' },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'any',
  },
  {
    type: 'memory_write',
    label: 'Memory Write',
    description: 'Persist a value to lenser memory under a key.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'MessageSquare',
    inputs: [{ name: 'value', type: 'any', required: true, description: 'Value to persist' }],
    outputs: [{ name: 'confirmation', type: 'json', description: 'Write confirmation' }],
    requiredConfig: ['key'],
    optionalConfig: ['value', 'lenserId'],
    exampleConfig: { key: 'research_notes' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
  },
  {
    type: 'chain',
    label: 'Chain',
    description: 'Accumulate upstream outputs into a multi-turn conversation thread.',
    category: 'ai_primitive',
    color: 'text-fuchsia-500',
    iconName: 'Link',
    inputs: [{ name: 'messages', type: 'text', description: 'Previous messages or outputs' }],
    outputs: [{ name: 'thread', type: 'json', description: 'Accumulated message array' }],
    requiredConfig: [],
    optionalConfig: ['systemPrompt', 'maxTurns', 'includeUpstream'],
    exampleConfig: { systemPrompt: 'You are a helpful assistant', maxTurns: 20 },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: '@n8n/n8n-nodes-langchain.chainLlm',
  },

  // ── CP: Storage & I/O ──────────────────────────────────────────────────
  {
    type: 'supabase_query',
    label: 'Supabase Query',
    description: 'Execute an allowlisted Supabase RPC function.',
    category: 'storage',
    color: 'text-amber-500',
    iconName: 'Database',
    inputs: [{ name: 'params', type: 'json', description: 'RPC parameters' }],
    outputs: [{ name: 'result', type: 'json', description: 'RPC response' }],
    requiredConfig: ['rpcName'],
    optionalConfig: ['params'],
    exampleConfig: { rpcName: 'fn_search_lenser_memory', params: { query: 'test' } },
    acceptsInputTypes: ['json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.postgres',
  },
  {
    type: 'kv_store_read',
    label: 'KV Read',
    description: 'Read a value from the workflow-scoped key-value store.',
    category: 'storage',
    color: 'text-amber-500',
    iconName: 'HardDrive',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the read' }],
    outputs: [{ name: 'value', type: 'any', description: 'Stored value' }],
    requiredConfig: ['key'],
    optionalConfig: [],
    exampleConfig: { key: 'session-id' },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'any',
    n8nEquivalent: 'n8n-nodes-base.redis',
  },
  {
    type: 'kv_store_write',
    label: 'KV Write',
    description: 'Write a value to the workflow-scoped key-value store (24h TTL).',
    category: 'storage',
    color: 'text-amber-500',
    iconName: 'HardDrive',
    inputs: [{ name: 'value', type: 'any', required: true, description: 'Value to store' }],
    outputs: [{ name: 'confirmation', type: 'json', description: 'Write confirmation' }],
    requiredConfig: ['key'],
    optionalConfig: ['value', 'ttlMs'],
    exampleConfig: { key: 'temp-data', ttlMs: 3600000 },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.redis',
  },
  {
    type: 'file_reader',
    label: 'File Reader',
    description: 'Fetch a file from an allowed domain and emit its content.',
    category: 'storage',
    color: 'text-amber-500',
    iconName: 'FileText',
    inputs: [{ name: 'url', type: 'text', description: 'File URL (or from upstream)' }],
    outputs: [{ name: 'content', type: 'text', description: 'File content or binary reference' }],
    requiredConfig: [],
    optionalConfig: ['url', 'allowedDomains'],
    exampleConfig: { url: 'https://cdn.lenserfight.com/docs/report.pdf' },
    acceptsInputTypes: ['text', 'any'],
    producesOutputType: 'text',
    n8nEquivalent: 'n8n-nodes-base.readBinaryFiles',
  },
  {
    type: 'webhook_sender',
    label: 'Webhook Send',
    description: 'Send an outbound HTTP request with retry logic.',
    category: 'storage',
    color: 'text-amber-500',
    iconName: 'Send',
    inputs: [{ name: 'body', type: 'any', description: 'Request body (from upstream or template)' }],
    outputs: [{ name: 'response', type: 'json', description: 'Response status and body' }],
    requiredConfig: ['url'],
    optionalConfig: ['method', 'headers', 'bodyTemplate', 'retries'],
    exampleConfig: { url: 'https://hooks.slack.com/services/T00/B00/xxx', method: 'POST', retries: 3 },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.httpRequest',
  },

  // ── CQ: Communication ──────────────────────────────────────────────────
  {
    type: 'email_send',
    label: 'Email Send',
    description: 'Send an email via Resend (rate-limited to 50/hr).',
    category: 'communication',
    color: 'text-teal-500',
    iconName: 'Mail',
    inputs: [{ name: 'body', type: 'text', description: 'Email body content' }],
    outputs: [{ name: 'status', type: 'json', description: 'Send confirmation' }],
    requiredConfig: ['to', 'subject'],
    optionalConfig: ['bodyTemplate'],
    exampleConfig: { to: 'team@example.com', subject: 'Workflow Report', bodyTemplate: 'Results: {{n1}}' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.emailSend',
  },
  {
    type: 'slack_notify',
    label: 'Slack Notify',
    description: 'Post a message to a Slack channel via webhook.',
    category: 'communication',
    color: 'text-teal-500',
    iconName: 'MessageSquare',
    inputs: [{ name: 'message', type: 'text', description: 'Message content' }],
    outputs: [{ name: 'status', type: 'json', description: 'Post confirmation' }],
    requiredConfig: ['webhookUrl'],
    optionalConfig: ['messageTemplate'],
    exampleConfig: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxx' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.slack',
  },
  {
    type: 'discord_notify',
    label: 'Discord Notify',
    description: 'Post a message to a Discord channel via webhook.',
    category: 'communication',
    color: 'text-teal-500',
    iconName: 'MessageSquare',
    inputs: [{ name: 'message', type: 'text', description: 'Message content (max 2000 chars)' }],
    outputs: [{ name: 'status', type: 'json', description: 'Post confirmation' }],
    requiredConfig: ['webhookUrl'],
    optionalConfig: ['messageTemplate'],
    exampleConfig: { webhookUrl: 'https://discord.com/api/webhooks/123/abc' },
    acceptsInputTypes: ['text', 'json', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.discord',
  },

  // ── CQ: Integrations ───────────────────────────────────────────────────
  {
    type: 'github_read',
    label: 'GitHub Read',
    description: 'Fetch issue or PR data from the GitHub API.',
    category: 'integration',
    color: 'text-emerald-500',
    iconName: 'Code2',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the fetch' }],
    outputs: [{ name: 'data', type: 'json', description: 'Issue/PR JSON response' }],
    requiredConfig: ['repo'],
    optionalConfig: ['resourceType', 'number'],
    exampleConfig: { repo: 'conectlens/lenserfight', resourceType: 'issue', number: 42 },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.github',
  },
  {
    type: 'rss_feed',
    label: 'RSS Feed',
    description: 'Fetch and parse an RSS/Atom feed into structured items.',
    category: 'integration',
    color: 'text-emerald-500',
    iconName: 'Rss',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the fetch' }],
    outputs: [{ name: 'items', type: 'array', description: 'Feed items with title, link, summary' }],
    requiredConfig: ['feedUrl'],
    optionalConfig: ['maxItems'],
    exampleConfig: { feedUrl: 'https://blog.lenserfight.com/feed.xml', maxItems: 10 },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'array',
    n8nEquivalent: 'n8n-nodes-base.rssFeedRead',
  },
  {
    type: 'notion_read',
    label: 'Notion Read',
    description: 'Fetch a Notion page or query a database.',
    category: 'integration',
    color: 'text-emerald-500',
    iconName: 'FileText',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the query' }],
    outputs: [{ name: 'content', type: 'json', description: 'Page blocks or database rows' }],
    requiredConfig: [],
    optionalConfig: ['pageId', 'databaseId', 'queryFilter'],
    exampleConfig: { databaseId: 'abc-123', queryFilter: { property: 'Status', equals: 'Done' } },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.notion',
  },
  {
    type: 'google_sheets_read',
    label: 'Sheets Read',
    description: 'Read rows from a Google Sheets spreadsheet.',
    category: 'integration',
    color: 'text-emerald-500',
    iconName: 'Table2',
    inputs: [{ name: 'trigger', type: 'any', description: 'Any input triggers the read' }],
    outputs: [{ name: 'rows', type: 'array', description: 'Sheet rows as arrays' }],
    requiredConfig: ['spreadsheetId', 'range'],
    optionalConfig: [],
    exampleConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', range: 'Sheet1!A1:D10' },
    acceptsInputTypes: ['any', 'void'],
    producesOutputType: 'array',
    n8nEquivalent: 'n8n-nodes-base.googleSheets',
  },
  {
    type: 'google_sheets_write',
    label: 'Sheets Write',
    description: 'Append or update rows in a Google Sheets spreadsheet.',
    category: 'integration',
    color: 'text-emerald-500',
    iconName: 'Table2',
    inputs: [{ name: 'data', type: 'any', required: true, description: 'Row data to write' }],
    outputs: [{ name: 'status', type: 'json', description: 'Write confirmation' }],
    requiredConfig: ['spreadsheetId', 'range'],
    optionalConfig: ['mode'],
    exampleConfig: { spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms', range: 'Sheet1!A1', mode: 'append' },
    acceptsInputTypes: ['json', 'array', 'any'],
    producesOutputType: 'json',
    n8nEquivalent: 'n8n-nodes-base.googleSheets',
  },

  // ── Extended categories (imported from nodes/*.catalog.ts) ──────────────
  ...TRIGGER_NODES,
  ...LOGIC_NEW_NODES,
  ...DATA_NEW_NODES,
  ...AI_NEW_NODES,
  ...BATTLE_NODES,
  ...STORAGE_NEW_NODES,
  ...COMMUNICATION_NEW_NODES,
  ...INTEGRATION_NEW_NODES,
  ...MEDIA_NODES,
  ...UTILITY_NODES,
]

// ── Lookup helpers ───────────────────────────────────────────────────────────

const catalogByType = new Map(WORKFLOW_NODE_CATALOG.map((n) => [n.type, n]))

export function getNodeCatalogEntry(type: string): CatalogNodeEntry | undefined {
  return catalogByType.get(type)
}

export function getNodesByCategory(category: NodeCategory): CatalogNodeEntry[] {
  return WORKFLOW_NODE_CATALOG.filter((n) => n.category === category)
}

export function getCategoryLabel(category: NodeCategory): string {
  const labels: Record<NodeCategory, string> = {
    lens: 'LenserFight',
    trigger: 'Triggers',
    logic: 'Logic',
    data: 'Data',
    ai_primitive: 'AI Primitives',
    battle: 'Battle / Arena',
    storage: 'Storage & I/O',
    communication: 'Communication',
    integration: 'Integrations',
    media: 'Media Generation',
    utility: 'Utility',
  }
  return labels[category]
}

export function getCategoryColor(category: NodeCategory): string {
  const colors: Record<NodeCategory, string> = {
    lens: 'text-primary-yellow-600',
    trigger: 'text-rose-500',
    logic: 'text-violet-500',
    data: 'text-sky-500',
    ai_primitive: 'text-fuchsia-500',
    battle: 'text-orange-500',
    storage: 'text-amber-500',
    communication: 'text-teal-500',
    integration: 'text-emerald-500',
    media: 'text-indigo-500',
    utility: 'text-gray-500',
  }
  return colors[category]
}

export function getCategoryIcon(category: NodeCategory): string {
  const icons: Record<NodeCategory, string> = {
    lens: 'Sparkles',
    trigger: 'Zap',
    logic: 'GitBranch',
    data: 'Database',
    ai_primitive: 'BrainCircuit',
    battle: 'Swords',
    storage: 'HardDrive',
    communication: 'Send',
    integration: 'Plug',
    media: 'Film',
    utility: 'Wrench',
  }
  return icons[category]
}

/** All categories in display order */
export const CATEGORY_ORDER: NodeCategory[] = [
  'lens', 'trigger', 'logic', 'data', 'ai_primitive', 'battle',
  'storage', 'communication', 'integration', 'media', 'utility',
]

/**
 * Check if two node types are compatible for edge connection.
 * Returns true if the source output type is accepted by the target input.
 */
export function areNodesCompatible(sourceType: string, targetType: string): boolean {
  const source = catalogByType.get(sourceType)
  const target = catalogByType.get(targetType)
  if (!source || !target) return true // unknown types default to compatible

  const sourceOutput = source.producesOutputType
  const targetAccepts = target.acceptsInputTypes

  // 'any' accepts everything; 'void' sources connect to anything
  if (targetAccepts.includes('any') || sourceOutput === 'any') return true
  if (targetAccepts.includes('void')) return true

  return targetAccepts.includes(sourceOutput)
}

/**
 * Search the catalog by label or description.
 */
export function searchCatalog(query: string): CatalogNodeEntry[] {
  const lower = query.toLowerCase().trim()
  if (!lower) return WORKFLOW_NODE_CATALOG
  return WORKFLOW_NODE_CATALOG.filter(
    (n) => n.label.toLowerCase().includes(lower) || n.description.toLowerCase().includes(lower) || n.type.includes(lower)
  )
}
