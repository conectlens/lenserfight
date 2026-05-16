import type { WorkflowNodeType } from '../execution.types'

export type WorkflowNodeCategory =
  | 'lens'
  | 'trigger'
  | 'logic'
  | 'data'
  | 'ai_primitive'
  | 'battle'
  | 'storage'
  | 'communication'
  | 'integration'
  | 'media'
  | 'utility'

export type WorkflowNodeIOType =
  | 'text'
  | 'json'
  | 'number'
  | 'boolean'
  | 'array'
  | 'object'
  | 'image'
  | 'audio'
  | 'video'
  | 'file'
  | 'embedding'
  | 'document[]'
  | 'battle_result'
  | 'lens_result'
  | 'agent_result'
  | 'workflow_result'
  | 'error'
  | 'any'
  | 'void'

export type WorkflowNodeConfigKind =
  | 'string'
  | 'number'
  | 'boolean'
  | 'json'
  | 'string[]'
  | 'select'
  | 'template'
  | 'secret'

export type WorkflowFundingMode = 'platform_credit' | 'user_byok_cloud' | 'user_byok_local' | 'free'

export type WorkflowExecutionEnvironment = 'browser' | 'worker' | 'server' | 'scheduled'

export interface WorkflowNodeSchemaField {
  name: string
  type: WorkflowNodeIOType
  required?: boolean
  description: string
  shape?: Record<string, WorkflowNodeIOType | string>
}

export interface WorkflowNodeConfigField {
  key: string
  label: string
  kind: WorkflowNodeConfigKind
  required?: boolean
  defaultValue?: unknown
  options?: string[]
  description: string
}

export interface WorkflowNodeRetryBehavior {
  maxAttempts: number
  backoffMs: number
  retryOn: string[]
}

export interface WorkflowNodeErrorBehavior {
  defaultPolicy: 'propagate' | 'skip' | 'substitute_default'
  supportsFallback: boolean
}

export interface WorkflowNodeConfigExample {
  scenario: string
  config: Record<string, unknown>
  expectedInput: Record<string, unknown>
  expectedOutput: Record<string, unknown>
  downstreamConnection: {
    nodeType: WorkflowCatalogNodeType
    mapping: Record<string, string>
  }
}

export interface WorkflowNodeN8nMapping {
  nodeType: string
  operation?: string
  mapped: boolean
}

export interface WorkflowNodeCatalogEntry {
  type: WorkflowCatalogNodeType
  displayName: string
  label: string
  description: string
  category: WorkflowNodeCategory
  aliases: string[]
  capabilities: string[]
  iconKey: string
  iconName: string
  color: string
  inputs: WorkflowNodeSchemaField[]
  outputs: WorkflowNodeSchemaField[]
  requiredConfig: WorkflowNodeConfigField[]
  optionalConfig: WorkflowNodeConfigField[]
  defaultConfig: Record<string, unknown>
  exampleConfig: WorkflowNodeConfigExample
  acceptsInputTypes: WorkflowNodeIOType[]
  producesOutputType: WorkflowNodeIOType
  supportedFundingModes: WorkflowFundingMode[]
  supportedExecutionEnvironments: WorkflowExecutionEnvironment[]
  retryBehavior: WorkflowNodeRetryBehavior
  errorBehavior: WorkflowNodeErrorBehavior
  docsLink: string
  docsPath: string
  exampleUseCase: string
  n8nMapping?: WorkflowNodeN8nMapping
  n8nEquivalent?: string
}

export type WorkflowCatalogNodeType = WorkflowNodeType | 'lens'

interface NodeDefinition {
  type: WorkflowCatalogNodeType
  displayName: string
  description: string
  category: WorkflowNodeCategory
  iconKey: string
  aliases?: string[]
  capabilities?: string[]
  inputs: WorkflowNodeSchemaField[]
  outputs: WorkflowNodeSchemaField[]
  requiredConfig?: WorkflowNodeConfigField[]
  optionalConfig?: WorkflowNodeConfigField[]
  defaultConfig?: Record<string, unknown>
  exampleConfig: WorkflowNodeConfigExample
  acceptsInputTypes: WorkflowNodeIOType[]
  producesOutputType: WorkflowNodeIOType
  funding?: WorkflowFundingMode[]
  environments?: WorkflowExecutionEnvironment[]
  retry?: Partial<WorkflowNodeRetryBehavior>
  error?: Partial<WorkflowNodeErrorBehavior>
  docsLink?: string
  exampleUseCase?: string
  n8n?: WorkflowNodeN8nMapping
}

export const WORKFLOW_NODE_CATEGORIES: readonly WorkflowNodeCategory[] = [
  'lens',
  'trigger',
  'logic',
  'data',
  'ai_primitive',
  'battle',
  'storage',
  'communication',
  'integration',
  'media',
  'utility',
] as const

const CATEGORY_LABELS: Record<WorkflowNodeCategory, string> = {
  lens: 'Lenses',
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

const CATEGORY_COLORS: Record<WorkflowNodeCategory, string> = {
  lens: 'text-primary-yellow-600',
  trigger: 'text-emerald-600',
  logic: 'text-violet-600',
  data: 'text-sky-600',
  ai_primitive: 'text-fuchsia-600',
  battle: 'text-rose-600',
  storage: 'text-cyan-600',
  communication: 'text-amber-600',
  integration: 'text-indigo-600',
  media: 'text-pink-600',
  utility: 'text-zinc-600',
}

const CATEGORY_ICONS: Record<WorkflowNodeCategory, string> = {
  lens: 'Sparkles',
  trigger: 'PlayCircle',
  logic: 'GitBranch',
  data: 'Database',
  ai_primitive: 'Brain',
  battle: 'Swords',
  storage: 'HardDrive',
  communication: 'Send',
  integration: 'Plug',
  media: 'Image',
  utility: 'Wrench',
}

const defaultRetry: WorkflowNodeRetryBehavior = {
  maxAttempts: 2,
  backoffMs: 1000,
  retryOn: ['timeout', 'provider_error', 'rate_limit'],
}

const defaultError: WorkflowNodeErrorBehavior = {
  defaultPolicy: 'propagate',
  supportsFallback: true,
}

const field = (
  key: string,
  kind: WorkflowNodeConfigKind,
  description: string,
  options: Partial<WorkflowNodeConfigField> = {},
): WorkflowNodeConfigField => ({
  key,
  label: options.label ?? toTitle(key),
  kind,
  description,
  ...options,
})

const io = (
  name: string,
  type: WorkflowNodeIOType,
  description: string,
  options: Partial<WorkflowNodeSchemaField> = {},
): WorkflowNodeSchemaField => ({
  name,
  type,
  description,
  ...options,
})

const example = (
  scenario: string,
  config: Record<string, unknown>,
  expectedInput: Record<string, unknown>,
  expectedOutput: Record<string, unknown>,
  nodeType: WorkflowCatalogNodeType,
  mapping: Record<string, string>,
): WorkflowNodeConfigExample => ({
  scenario,
  config,
  expectedInput,
  expectedOutput,
  downstreamConnection: { nodeType, mapping },
})

const n8n = (nodeType: string, operation?: string): WorkflowNodeN8nMapping => ({
  nodeType,
  operation,
  mapped: true,
})

function defineNode(def: NodeDefinition): WorkflowNodeCatalogEntry {
  const color = CATEGORY_COLORS[def.category]
  const docsLink = def.docsLink ?? `/docs/workflows/nodes/${def.type}`
  return {
    type: def.type,
    displayName: def.displayName,
    label: def.displayName,
    description: def.description,
    category: def.category,
    aliases: def.aliases ?? [],
    capabilities: def.capabilities ?? [],
    iconKey: def.iconKey,
    iconName: def.iconKey,
    color,
    inputs: def.inputs,
    outputs: def.outputs,
    requiredConfig: def.requiredConfig ?? [],
    optionalConfig: def.optionalConfig ?? [],
    defaultConfig: def.defaultConfig ?? {},
    exampleConfig: def.exampleConfig,
    acceptsInputTypes: def.acceptsInputTypes,
    producesOutputType: def.producesOutputType,
    supportedFundingModes: def.funding ?? ['free'],
    supportedExecutionEnvironments: def.environments ?? ['browser', 'worker'],
    retryBehavior: { ...defaultRetry, ...(def.retry ?? {}) },
    errorBehavior: { ...defaultError, ...(def.error ?? {}) },
    docsLink,
    docsPath: docsLink,
    exampleUseCase: def.exampleUseCase ?? def.exampleConfig.scenario,
    n8nMapping: def.n8n,
    n8nEquivalent: def.n8n?.nodeType,
  }
}

const textIn = [io('text', 'text', 'Text from an upstream node.', { required: true })]
const anyIn = [io('input', 'any', 'Any upstream payload.')]
const jsonIn = [io('json', 'json', 'Structured JSON from an upstream node.', { required: true })]
const voidIn = [io('trigger', 'void', 'No upstream input required.')]

export const WORKFLOW_NODE_CATALOG: readonly WorkflowNodeCatalogEntry[] = [
  defineNode({
    type: 'lens',
    displayName: 'Lens',
    description: 'Execute a LenserFight lens prompt with model, funding, and parameter overrides.',
    category: 'lens',
    iconKey: 'Sparkles',
    inputs: textIn,
    outputs: [io('text', 'text', 'Generated lens text.', { shape: { text: 'text', modelId: 'text' } })],
    requiredConfig: [field('model_id', 'string', 'AI model key used by the lens.', { required: true })],
    optionalConfig: [
      field('param_overrides', 'json', 'Lens parameter overrides.'),
      field('funding_source', 'select', 'Funding source for execution.', {
        defaultValue: 'platform_credit',
        options: ['platform_credit', 'user_byok_cloud', 'user_byok_local'],
      }),
    ],
    defaultConfig: { funding_source: 'platform_credit' },
    exampleConfig: example(
      'Generate the weekly arena digest from aggregated battle data.',
      { model_id: 'openai:gpt-4.1-mini', funding_source: 'platform_credit', param_overrides: { tone: 'concise' } },
      { text: 'Summarize this week of arena results.' },
      { text: 'Weekly digest with top contenders, outliers, and recommended rematches.' },
      'email_send',
      { body: '$.text' },
    ),
    acceptsInputTypes: ['text', 'json', 'object'],
    producesOutputType: 'text',
    funding: ['platform_credit', 'user_byok_cloud', 'user_byok_local'],
    n8n: n8n('n8n-nodes-base.openAi', 'message'),
  }),

  ...triggerNodes(),
  ...logicNodes(),
  ...dataNodes(),
  ...aiPrimitiveNodes(),
  ...battleNodes(),
  ...storageNodes(),
  ...communicationNodes(),
  ...integrationNodes(),
  ...mediaNodes(),
  ...utilityNodes(),
] as const

const CATALOG_BY_TYPE = new Map(WORKFLOW_NODE_CATALOG.map((entry) => [entry.type, entry]))

export function getWorkflowNodeCatalogEntry(type: string | null | undefined): WorkflowNodeCatalogEntry | undefined {
  if (!type) return undefined
  return CATALOG_BY_TYPE.get(type as WorkflowCatalogNodeType)
}

export function getWorkflowNodesByCategory(category: WorkflowNodeCategory): WorkflowNodeCatalogEntry[] {
  return WORKFLOW_NODE_CATALOG.filter((entry) => entry.category === category)
}

export function getWorkflowNodeCategoryLabel(category: WorkflowNodeCategory): string {
  return CATEGORY_LABELS[category]
}

export function getWorkflowNodeCategoryColor(category: WorkflowNodeCategory): string {
  return CATEGORY_COLORS[category]
}

export function getWorkflowNodeCategoryIcon(category: WorkflowNodeCategory): string {
  return CATEGORY_ICONS[category]
}

export function getWorkflowNodeCategoryCounts(): Record<WorkflowNodeCategory, number> {
  return WORKFLOW_NODE_CATEGORIES.reduce((acc, category) => {
    acc[category] = getWorkflowNodesByCategory(category).length
    return acc
  }, {} as Record<WorkflowNodeCategory, number>)
}

export function isWorkflowUtilityNodeType(type: string | null | undefined): type is WorkflowNodeType {
  const entry = getWorkflowNodeCatalogEntry(type)
  return !!entry && entry.category !== 'lens'
}

export function areWorkflowNodesCompatible(
  sourceNodeType: string | null | undefined,
  targetNodeType: string | null | undefined,
): boolean {
  const source = getWorkflowNodeCatalogEntry(sourceNodeType)
  const target = getWorkflowNodeCatalogEntry(targetNodeType)
  if (!source || !target) return true
  if (target.acceptsInputTypes.includes('any')) return true
  if (source.producesOutputType === 'any') return true
  return target.acceptsInputTypes.includes(source.producesOutputType)
}

export function getWorkflowNodeCompatibilityWarning(
  sourceNodeType: string | null | undefined,
  targetNodeType: string | null | undefined,
): string | null {
  if (areWorkflowNodesCompatible(sourceNodeType, targetNodeType)) return null
  const source = getWorkflowNodeCatalogEntry(sourceNodeType)
  const target = getWorkflowNodeCatalogEntry(targetNodeType)
  if (!source || !target) return null
  return `${source.displayName} outputs ${source.producesOutputType}, but ${target.displayName} expects ${target.acceptsInputTypes.join(', ')}. Add a transform/parser node between them.`
}

export function searchWorkflowNodeCatalog(query: string): WorkflowNodeCatalogEntry[] {
  const q = query.trim().toLowerCase()
  if (!q) return [...WORKFLOW_NODE_CATALOG]
  return WORKFLOW_NODE_CATALOG.filter((entry) => {
    const haystack = [
      entry.type,
      entry.displayName,
      entry.description,
      entry.category,
      ...entry.aliases,
      ...entry.capabilities,
    ].join(' ').toLowerCase()
    return haystack.includes(q)
  })
}

export interface WorkflowNodeCardMetadata {
  type: WorkflowCatalogNodeType
  title: string
  description: string
  category: WorkflowNodeCategory
  categoryLabel: string
  iconKey: string
  color: string
  capabilities: string[]
  n8nEquivalent?: string
}

export function buildWorkflowNodeCardMetadata(entry: WorkflowNodeCatalogEntry): WorkflowNodeCardMetadata {
  return {
    type: entry.type,
    title: entry.displayName,
    description: entry.description,
    category: entry.category,
    categoryLabel: getWorkflowNodeCategoryLabel(entry.category),
    iconKey: entry.iconKey,
    color: entry.color,
    capabilities: entry.capabilities,
    n8nEquivalent: entry.n8nEquivalent,
  }
}

export function validateWorkflowNodeCatalog(): string[] {
  const issues: string[] = []
  const seen = new Set<string>()
  for (const entry of WORKFLOW_NODE_CATALOG) {
    if (seen.has(entry.type)) issues.push(`Duplicate node type: ${entry.type}`)
    seen.add(entry.type)
    if (!entry.inputs.length) issues.push(`${entry.type} is missing input schema`)
    if (!entry.outputs.length) issues.push(`${entry.type} is missing output schema`)
    if (!entry.exampleConfig.config) issues.push(`${entry.type} is missing example configuration`)
    if (!entry.exampleConfig.expectedInput) issues.push(`${entry.type} is missing example input`)
    if (!entry.exampleConfig.expectedOutput) issues.push(`${entry.type} is missing example output`)
    if (!entry.exampleConfig.downstreamConnection) issues.push(`${entry.type} is missing downstream example`)
  }
  return issues
}

function triggerNodes(): WorkflowNodeCatalogEntry[] {
  return [
    defineNode({
      type: 'manual_trigger',
      displayName: 'Manual Trigger',
      description: 'Start a workflow manually with optional root inputs.',
      category: 'trigger',
      iconKey: 'MousePointerClick',
      inputs: voidIn,
      outputs: [io('rootInputs', 'json', 'Root inputs supplied by the user.', { shape: { query: 'text', payload: 'json' } })],
      optionalConfig: [field('inputSchema', 'json', 'Optional JSON schema for manual input form.')],
      exampleConfig: example(
        'Kick off an ad hoc RAG answer run from a typed question.',
        { inputSchema: { query: { type: 'string', required: true } } },
        {},
        { rootInputs: { query: 'Which battle strategy won most often this week?' } },
        'rag_retrieval',
        { query: '$.rootInputs.query' },
      ),
      acceptsInputTypes: ['void'],
      producesOutputType: 'json',
      n8n: n8n('n8n-nodes-base.manualTrigger'),
    }),
    defineNode({
      type: 'schedule_trigger',
      displayName: 'Schedule Trigger',
      description: 'Start a workflow on a cron schedule or interval.',
      category: 'trigger',
      iconKey: 'CalendarClock',
      inputs: voidIn,
      outputs: [io('schedule', 'json', 'Schedule firing metadata.', { shape: { firedAt: 'text', timezone: 'text' } })],
      requiredConfig: [field('cron', 'string', 'Cron expression used to fire the workflow.', { required: true })],
      optionalConfig: [field('timezone', 'string', 'IANA timezone.', { defaultValue: 'UTC' })],
      defaultConfig: { timezone: 'UTC' },
      exampleConfig: example(
        'Generate a Monday morning arena digest.',
        { cron: '0 8 * * MON', timezone: 'Europe/Istanbul' },
        {},
        { firedAt: '2026-05-18T08:00:00+03:00', timezone: 'Europe/Istanbul' },
        'supabase_query',
        { since: '$.firedAt' },
      ),
      acceptsInputTypes: ['void'],
      producesOutputType: 'json',
      environments: ['scheduled', 'worker', 'server'],
      n8n: n8n('n8n-nodes-base.scheduleTrigger'),
    }),
    defineNode({
      type: 'webhook_trigger',
      displayName: 'Webhook Trigger',
      description: 'Start a workflow from an inbound HTTP request.',
      category: 'trigger',
      iconKey: 'Webhook',
      inputs: voidIn,
      outputs: [io('request', 'json', 'Inbound request payload.', { shape: { body: 'json', headers: 'json', method: 'text' } })],
      requiredConfig: [field('path', 'string', 'Public webhook path.', { required: true })],
      optionalConfig: [field('method', 'select', 'Allowed HTTP method.', { defaultValue: 'POST', options: ['POST', 'GET', 'PUT'] })],
      defaultConfig: { method: 'POST' },
      exampleConfig: example(
        'Receive a GitHub webhook and route pull request events.',
        { path: '/hooks/github-pr-review', method: 'POST', secretRef: 'github-webhook-secret' },
        {},
        { body: { action: 'opened', pull_request: { number: 42 } }, headers: { 'x-github-event': 'pull_request' } },
        'github_pr_review',
        { prNumber: '$.body.pull_request.number' },
      ),
      acceptsInputTypes: ['void'],
      producesOutputType: 'json',
      environments: ['server', 'worker'],
      n8n: n8n('n8n-nodes-base.webhook'),
    }),
    defineNode({
      type: 'event_trigger',
      displayName: 'Event Trigger',
      description: 'Start a workflow from a LenserFight domain event.',
      category: 'trigger',
      iconKey: 'Radio',
      inputs: voidIn,
      outputs: [io('event', 'json', 'Event envelope.', { shape: { eventType: 'text', entityId: 'text', payload: 'json' } })],
      requiredConfig: [field('eventType', 'string', 'Domain event name.', { required: true })],
      exampleConfig: example(
        'Notify Slack when a battle completes.',
        { eventType: 'battle.completed', workspaceId: '{{workspace.id}}' },
        {},
        { eventType: 'battle.completed', entityId: 'battle_123', payload: { winner: 'contender-a' } },
        'slack_notify',
        { text: '$.payload.winner' },
      ),
      acceptsInputTypes: ['void'],
      producesOutputType: 'json',
      environments: ['worker', 'server'],
    }),
    defineNode({
      type: 'form_input_trigger',
      displayName: 'Form / Input Trigger',
      description: 'Start a workflow from a rendered form and expose submitted fields.',
      category: 'trigger',
      iconKey: 'FormInput',
      inputs: voidIn,
      outputs: [io('submission', 'json', 'Validated form submission.', { shape: { fields: 'json', submittedBy: 'text' } })],
      requiredConfig: [field('fields', 'json', 'Form fields and validation rules.', { required: true })],
      exampleConfig: example(
        'Collect contender names before running a judged battle.',
        { fields: [{ key: 'prompt', type: 'textarea', required: true }, { key: 'contenders', type: 'array', required: true }] },
        {},
        { fields: { prompt: 'Debate RAG answer style', contenders: ['concise', 'thorough'] } },
        'battle_execute',
        { prompt: '$.fields.prompt', contenders: '$.fields.contenders' },
      ),
      acceptsInputTypes: ['void'],
      producesOutputType: 'json',
      n8n: n8n('n8n-nodes-base.formTrigger'),
    }),
  ]
}

function logicNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('code', 'Code', 'Execute sandboxed JavaScript or TypeScript against upstream data.', 'logic', 'Code2', anyIn, 'json', {
      required: [field('code', 'template', 'Code body that returns a JSON-compatible value.', { required: true })],
      optional: [field('timeoutMs', 'number', 'Execution timeout in milliseconds.', { defaultValue: 5000 })],
      config: { code: 'return { digestText: input.summary, itemCount: input.items.length };', timeoutMs: 5000 },
      output: { result: { digestText: '3 battles changed rank.', itemCount: 12 } },
      downstream: 'email_send',
      mapping: { body: '$.result.digestText' },
      n8nNode: 'n8n-nodes-base.code',
      capabilities: ['transform', 'script', 'json'],
    }),
    simpleNode('switch', 'Switch', 'Route execution by matching configured cases.', 'logic', 'GitBranch', anyIn, 'text', {
      required: [field('cases', 'json', 'Ordered branch cases.', { required: true })],
      optional: [field('inputPath', 'string', 'Input path to evaluate.'), field('defaultBranch', 'string', 'Fallback branch label.')],
      config: { inputPath: '$.status', cases: [{ label: 'failed', operator: 'equals', value: 'failed' }], defaultBranch: 'ok' },
      output: { branch: 'failed' },
      downstream: 'slack_notify',
      mapping: { text: '$.branch' },
      n8nNode: 'n8n-nodes-base.switch',
      capabilities: ['routing', 'branching'],
    }),
    simpleNode('if_condition', 'If / Condition', 'Continue when a boolean condition evaluates true.', 'logic', 'HelpCircle', anyIn, 'boolean', {
      required: [field('condition', 'template', 'Boolean expression or mapping.', { required: true })],
      config: { condition: '$.score >= 0.8' },
      output: { passed: true },
      downstream: 'leaderboard_update',
      mapping: { approved: '$.passed' },
      n8nNode: 'n8n-nodes-base.if',
    }),
    simpleNode('loop_map', 'Loop / Map', 'Map over an array and emit transformed items.', 'logic', 'Repeat', [io('items', 'array', 'Items to iterate.', { required: true })], 'array', {
      optional: [field('arrayPath', 'string', 'Array path.', { defaultValue: '$.items' }), field('maxItems', 'number', 'Maximum items to process.', { defaultValue: 100 })],
      config: { arrayPath: '$.documents', itemVariable: 'document', maxItems: 25 },
      output: { items: [{ title: 'Battle recap', score: 0.91 }] },
      downstream: 'summarizer',
      mapping: { documents: '$.items' },
      n8nNode: 'n8n-nodes-base.splitInBatches',
    }),
    simpleNode('wait_delay', 'Wait / Delay', 'Pause execution for a duration or until a timestamp.', 'logic', 'Clock', anyIn, 'json', {
      optional: [field('delayMs', 'number', 'Delay in milliseconds.', { defaultValue: 5000 }), field('delayUntil', 'string', 'ISO timestamp to resume at.')],
      config: { delayMs: 300000 },
      output: { resumedAt: '2026-05-16T09:05:00Z' },
      downstream: 'github_read',
      mapping: { since: '$.resumedAt' },
      n8nNode: 'n8n-nodes-base.wait',
    }),
    simpleNode('error_catch', 'Error Catch', 'Handle an upstream error and route fallback data.', 'logic', 'AlertTriangle', [io('error', 'error', 'Error envelope from a failed node.')], 'json', {
      optional: [field('fallbackValue', 'json', 'Fallback JSON to emit.'), field('continueOnError', 'boolean', 'Continue after fallback.', { defaultValue: true })],
      config: { fallbackValue: { alert: 'Workflow failed while summarizing RSS.' }, continueOnError: true },
      output: { recovery: { alert: 'Workflow failed while summarizing RSS.' } },
      downstream: 'slack_notify',
      mapping: { text: '$.recovery.alert' },
      n8nNode: 'n8n-nodes-base.errorTrigger',
    }),
    simpleNode('try_catch', 'Try / Catch', 'Run a protected branch and emit either result or error.', 'logic', 'ShieldAlert', anyIn, 'json', {
      optional: [field('catchBranch', 'string', 'Fallback branch label.', { defaultValue: 'catch' })],
      config: { catchBranch: 'notify_failure' },
      output: { ok: false, error: { message: 'Provider timeout' } },
      downstream: 'slack_notify',
      mapping: { text: '$.error.message' },
    }),
    simpleNode('merge', 'Merge', 'Merge multiple upstream values into one payload.', 'logic', 'Merge', anyIn, 'json', {
      optional: [field('strategy', 'select', 'Merge strategy.', { defaultValue: 'json_object', options: ['last_write_wins', 'concat', 'array', 'json_object'] })],
      config: { strategy: 'json_object' },
      output: { merged: { digest: '...', scores: [0.8, 0.9] } },
      downstream: 'email_send',
      mapping: { body: '$.merged.digest' },
      n8nNode: 'n8n-nodes-base.merge',
    }),
    simpleNode('split_in_batches', 'Split In Batches', 'Split a large array into batches for downstream processing.', 'logic', 'Rows3', [io('items', 'array', 'Array to batch.', { required: true })], 'array', {
      optional: [field('batchSize', 'number', 'Batch size.', { defaultValue: 25 })],
      config: { batchSize: 10 },
      output: { batch: [{ url: 'https://example.com/feed/1' }] },
      downstream: 'rss_feed',
      mapping: { urls: '$.batch' },
      n8nNode: 'n8n-nodes-base.splitInBatches',
    }),
    simpleNode('sub_workflow', 'Sub-Workflow', 'Execute another workflow with mapped inputs.', 'logic', 'Workflow', jsonIn, 'workflow_result', {
      required: [field('workflowId', 'string', 'Workflow id to invoke.', { required: true })],
      optional: [field('inputMapping', 'json', 'Input mapping passed to the child workflow.'), field('maxDepth', 'number', 'Maximum orchestration depth.', { defaultValue: 2 })],
      config: { workflowId: 'wf_weekly_digest', inputMapping: { topic: '$.topic', window: '$.window' }, maxDepth: 2 },
      output: { workflowResult: { status: 'completed', output: 'Digest ready' } },
      downstream: 'email_send',
      mapping: { body: '$.workflowResult.output' },
      n8nNode: 'n8n-nodes-base.executeWorkflow',
    }),
    simpleNode('stop_return', 'Stop / Return', 'Stop execution and return a final payload.', 'logic', 'OctagonX', anyIn, 'workflow_result', {
      optional: [field('returnPath', 'string', 'Path to return as workflow result.', { defaultValue: '$' }), field('status', 'select', 'Terminal status.', { defaultValue: 'completed', options: ['completed', 'failed'] })],
      config: { returnPath: '$.answer', status: 'completed' },
      output: { workflowResult: { status: 'completed', output: 'Approved answer' } },
      downstream: 'logger',
      mapping: { message: '$.workflowResult.output' },
    }),
  ]
}

function dataNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('json_transform', 'JSON Transform', 'Transform JSON with a mapping expression.', 'data', 'Braces', jsonIn, 'json', dataOpts('expression', { expression: '{ title: input.title, score: input.score }' }, { transformed: { title: 'Lens A', score: 0.92 } }, 'data_mapper', 'n8n-nodes-base.set')),
    simpleNode('set_variables', 'Set Variables', 'Set workflow variables for downstream nodes.', 'data', 'Variable', anyIn, 'json', dataOpts('variables', { variables: { digestWindow: '7d', channel: '#arena-alerts' } }, { variables: { digestWindow: '7d', channel: '#arena-alerts' } }, 'prompt_template', 'n8n-nodes-base.set')),
    simpleNode('extract_field', 'Extract Field', 'Extract one field from an object or JSON payload.', 'data', 'ScanText', jsonIn, 'text', dataOpts('path', { path: '$.pull_request.body' }, { value: 'This PR adds workflow runners.' }, 'summarizer')),
    simpleNode('rename_field', 'Rename Field', 'Rename a field while preserving the rest of the payload.', 'data', 'Replace', jsonIn, 'json', dataOpts('renames', { renames: { body: 'digestBody', title: 'digestTitle' } }, { digestBody: '...', digestTitle: 'Weekly digest' }, 'email_send')),
    simpleNode('filter_items', 'Filter Items', 'Filter array items by condition.', 'data', 'Filter', [io('items', 'array', 'Items to filter.', { required: true })], 'array', dataOpts('condition', { condition: '$.score >= 0.75' }, { items: [{ id: 'doc_1', score: 0.91 }] }, 'rag_retrieval')),
    simpleNode('aggregate', 'Aggregate', 'Aggregate numeric or grouped values from an array.', 'data', 'Sigma', [io('items', 'array', 'Items to aggregate.', { required: true })], 'json', dataOpts('groupBy', { groupBy: '$.contender', metrics: [{ field: '$.score', op: 'avg', as: 'averageScore' }] }, { groups: [{ contender: 'A', averageScore: 0.84 }] }, 'score_aggregator')),
    simpleNode('sort', 'Sort', 'Sort items by a configured field and direction.', 'data', 'ArrowDownUp', [io('items', 'array', 'Items to sort.', { required: true })], 'array', dataOpts('sortBy', { sortBy: '$.score', direction: 'desc' }, { items: [{ id: 'a', score: 0.98 }] }, 'leaderboard_update')),
    simpleNode('deduplicate', 'Deduplicate', 'Remove duplicate items by key.', 'data', 'ListX', [io('items', 'array', 'Items to deduplicate.', { required: true })], 'array', dataOpts('keyPath', { keyPath: '$.url' }, { items: [{ url: 'https://example.com/post', title: 'Arena news' }] }, 'summarizer')),
    simpleNode('text_splitter', 'Text Splitter', 'Split long text or documents into chunks.', 'data', 'TextCursorInput', textIn, 'document[]', {
      required: [field('chunkSize', 'number', 'Chunk size in characters.', { required: true, defaultValue: 1000 })],
      optional: [field('chunkOverlap', 'number', 'Overlap between chunks.', { defaultValue: 120 })],
      config: { chunkSize: 1000, chunkOverlap: 120 },
      output: { documents: [{ pageContent: 'Battle report chunk...', metadata: { chunk: 1 } }] },
      downstream: 'embedding',
      mapping: { documents: '$.documents' },
      n8nNode: 'n8n-nodes-base.textSplitterRecursiveCharacterTextSplitter',
    }),
    simpleNode('data_mapper', 'Data Mapper', 'Map fields from one schema into another.', 'data', 'Waypoints', anyIn, 'json', dataOpts('mapping', { mapping: { to: '$.owner.email', subject: 'PR Review: {{title}}', body: '$.summary' } }, { to: 'owner@example.com', subject: 'PR Review: Add runners', body: 'Review summary...' }, 'email_send')),
  ]
}

function aiPrimitiveNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('prompt_template', 'Prompt Template', 'Render a prompt from variables and upstream data.', 'ai_primitive', 'FileText', anyIn, 'text', {
      required: [field('template', 'template', 'Prompt template.', { required: true })],
      optional: [field('variables', 'json', 'Explicit variable mappings.')],
      config: { template: 'Summarize these arena results for {{audience}}: {{results}}', variables: { audience: 'founders', results: '$.results' } },
      output: { prompt: 'Summarize these arena results for founders: ...' },
      downstream: 'lens_execute',
      mapping: { prompt: '$.prompt' },
      n8nNode: 'n8n-nodes-base.set',
      capabilities: ['prompting', 'template'],
    }),
    simpleNode('lens_execute', 'Lens Execute', 'Execute a selected LenserFight lens as a utility node.', 'ai_primitive', 'Sparkles', textIn, 'lens_result', {
      required: [field('lensId', 'string', 'Lens id.', { required: true }), field('model_id', 'string', 'Model key.', { required: true })],
      optional: [field('param_overrides', 'json', 'Lens parameter overrides.')],
      config: { lensId: 'lens_weekly_digest', model_id: 'openai:gpt-4.1-mini', param_overrides: { tone: 'crisp' } },
      output: { lensResult: { text: 'Weekly digest...', modelId: 'openai:gpt-4.1-mini' } },
      downstream: 'email_send',
      mapping: { body: '$.lensResult.text' },
      n8nNode: 'n8n-nodes-base.openAi',
    }),
    simpleNode('agent_execute', 'Agent Execute', 'Delegate work to a configured LenserFight agent.', 'ai_primitive', 'Bot', textIn, 'agent_result', {
      required: [field('agentId', 'string', 'Agent id.', { required: true }), field('task', 'template', 'Task prompt.', { required: true })],
      optional: [field('delegationPolicy', 'select', 'Delegation policy.', { defaultValue: 'auto', options: ['auto', 'approval_required', 'forbidden'] })],
      config: { agentId: 'agent_pr_reviewer', task: 'Review PR {{prNumber}} for security and tests.', delegationPolicy: 'approval_required' },
      output: { agentResult: { status: 'completed', summary: 'Found 2 issues', artifacts: [] } },
      downstream: 'github_pr_review',
      mapping: { reviewBody: '$.agentResult.summary' },
    }),
    simpleNode('output_parser', 'Output Parser', 'Parse model text into strict JSON fields.', 'ai_primitive', 'Braces', textIn, 'json', {
      optional: [field('schema', 'json', 'Expected output schema.'), field('strict', 'boolean', 'Fail when parsing is incomplete.', { defaultValue: true })],
      config: { schema: { score: 'number', reasoning: 'string', winner: 'string' }, strict: true },
      output: { score: 0.86, reasoning: 'Candidate A cites more evidence.', winner: 'candidate_a' },
      downstream: 'judge_evaluator',
      mapping: { candidates: '$' },
      n8nNode: 'n8n-nodes-base.itemLists',
    }),
    defineNode({
      type: 'embedding',
      displayName: 'Embedding',
      description: 'Convert text or documents into embedding vectors with metadata.',
      category: 'ai_primitive',
      iconKey: 'Fingerprint',
      inputs: [io('content', 'text', 'Text to embed.'), io('documents', 'document[]', 'Documents to embed.')],
      outputs: [io('embedding', 'embedding', 'Embedding vector and metadata.', { shape: { vector: 'number[]', dimensions: 'number', metadata: 'json' } })],
      requiredConfig: [field('provider', 'select', 'Embedding provider.', { required: true, options: ['openai', 'google', 'mistral'] }), field('model', 'string', 'Embedding model.', { required: true })],
      optionalConfig: [field('inputPath', 'string', 'Input mapping.', { defaultValue: '$.text' }), field('chunkSize', 'number', 'Chunk size.', { defaultValue: 1000 }), field('dimensions', 'number', 'Vector dimensions.', { defaultValue: 1536 }), field('metadataFields', 'string[]', 'Metadata fields to preserve.')],
      defaultConfig: { provider: 'openai', model: 'text-embedding-3-small', inputPath: '$.text', chunkSize: 1000, dimensions: 1536 },
      exampleConfig: example(
        'Embed battle reports for later RAG retrieval.',
        { provider: 'openai', model: 'text-embedding-3-small', inputPath: '$.documents[*].pageContent', chunkSize: 1000, dimensions: 1536, metadataFields: ['battleId', 'contenderId'], retry: { attempts: 3, backoffMs: 1500 } },
        { documents: [{ pageContent: 'Contender A won by citing sources.', metadata: { battleId: 'battle_123' } }] },
        { embedding: { vector: [0.013, -0.024, 0.071], dimensions: 1536, metadata: { battleId: 'battle_123' } } },
        'vector_search',
        { vector: '$.embedding.vector', metadata: '$.embedding.metadata' },
      ),
      acceptsInputTypes: ['text', 'document[]'],
      producesOutputType: 'embedding',
      funding: ['platform_credit', 'user_byok_cloud'],
      n8n: n8n('@n8n/n8n-nodes-langchain.embeddingsOpenAi'),
    }),
    defineNode({
      type: 'rag_retrieval',
      displayName: 'RAG Retriever',
      description: 'Retrieve scored documents from a vector source for a query.',
      category: 'ai_primitive',
      iconKey: 'Search',
      inputs: [io('query', 'text', 'Search query.', { required: true }), io('source', 'embedding', 'Optional query embedding.')],
      outputs: [io('documents', 'document[]', 'Retrieved documents with scores.', { shape: { documents: 'document[]', scores: 'number[]' } })],
      requiredConfig: [field('vectorStore', 'string', 'Vector source.', { required: true }), field('queryPath', 'string', 'Query mapping.', { required: true })],
      optionalConfig: [field('topK', 'number', 'Maximum documents.', { defaultValue: 5 }), field('similarityThreshold', 'number', 'Minimum score.', { defaultValue: 0.72 }), field('filters', 'json', 'Metadata filters.'), field('rerank', 'boolean', 'Enable reranking.', { defaultValue: true })],
      defaultConfig: { topK: 5, similarityThreshold: 0.72, rerank: true },
      exampleConfig: example(
        'Retrieve knowledge base passages before answering a user question.',
        { vectorStore: 'supabase:workflow_documents', queryPath: '$.rootInputs.query', topK: 6, similarityThreshold: 0.74, filters: { workspaceId: '{{workspace.id}}' }, rerank: true },
        { query: 'What judging rubric did we use for PR battles?' },
        { documents: [{ id: 'doc_7', pageContent: 'Rubric: correctness, tests, security...', score: 0.91, metadata: { source: 'arena-rubric.md' } }] },
        'prompt_template',
        { context: '$.documents[*].pageContent' },
      ),
      acceptsInputTypes: ['text', 'embedding', 'json'],
      producesOutputType: 'document[]',
      funding: ['platform_credit', 'user_byok_cloud'],
      n8n: n8n('@n8n/n8n-nodes-langchain.vectorStoreSupabase', 'retrieve'),
    }),
    simpleNode('vector_search', 'Vector Search', 'Search vectors directly using an embedding input.', 'ai_primitive', 'Radar', [io('embedding', 'embedding', 'Query vector.', { required: true })], 'document[]', {
      required: [field('vectorStore', 'string', 'Vector index name.', { required: true })],
      optional: [field('topK', 'number', 'Maximum matches.', { defaultValue: 5 })],
      config: { vectorStore: 'supabase:workflow_documents', topK: 5, filters: { battleId: '$.metadata.battleId' } },
      output: { documents: [{ id: 'doc_1', score: 0.88, pageContent: '...' }] },
      downstream: 'summarizer',
      mapping: { documents: '$.documents' },
      n8nNode: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
    }),
    defineNode({
      type: 'judge_evaluator',
      displayName: 'Judge / Eval',
      description: 'Evaluate candidates against a rubric and emit structured scoring.',
      category: 'ai_primitive',
      iconKey: 'Scale',
      inputs: [io('candidates', 'json', 'Candidate outputs.', { required: true }), io('rubric', 'text', 'Evaluation rubric.')],
      outputs: [io('evaluation', 'json', 'Score, reasoning, winner, and confidence.', { shape: { score: 'number', reasoning: 'text', winner: 'text', confidence: 'number' } })],
      requiredConfig: [field('rubric', 'template', 'Evaluation rubric.', { required: true }), field('scoringScale', 'string', 'Scoring scale.', { required: true })],
      optionalConfig: [field('judgeModel', 'string', 'Judge model key.'), field('tieBreakRule', 'string', 'Tie break behavior.'), field('outputParser', 'json', 'Parser schema.'), field('confidenceThreshold', 'number', 'Minimum confidence.', { defaultValue: 0.7 })],
      defaultConfig: { scoringScale: '0-100', confidenceThreshold: 0.7 },
      exampleConfig: example(
        'Judge two RAG answers and pick the best sourced response.',
        { rubric: 'Score correctness, source coverage, and actionability. Return JSON.', scoringScale: '0-100', candidateMappings: { a: '$.answerA', b: '$.answerB' }, judgeModel: 'anthropic:claude-3-7-sonnet', tieBreakRule: 'prefer_higher_source_coverage', outputParser: { winner: 'string', score: 'number', reasoning: 'string' }, confidenceThreshold: 0.76 },
        { answerA: 'Use workflow runners...', answerB: 'Use a lens only...' },
        { score: 91, reasoning: 'Answer A is more complete and cites runner config.', winner: 'answerA', confidence: 0.84, evaluationJson: { criteria: { correctness: 46, tests: 45 } } },
        'score_aggregator',
        { score: '$.score', winner: '$.winner' },
      ),
      acceptsInputTypes: ['json', 'text', 'lens_result', 'agent_result'],
      producesOutputType: 'json',
      funding: ['platform_credit', 'user_byok_cloud', 'user_byok_local'],
      n8n: n8n('@n8n/n8n-nodes-langchain.chainLlm'),
    }),
    simpleNode('memory_read', 'Memory Read', 'Read conversation or workflow memory entries.', 'ai_primitive', 'BookOpen', anyIn, 'document[]', {
      required: [field('memoryKey', 'string', 'Memory namespace.', { required: true })],
      optional: [field('limit', 'number', 'Maximum entries.', { defaultValue: 10 })],
      config: { memoryKey: 'workspace:arena-digests', limit: 8, query: '$.query' },
      output: { documents: [{ pageContent: 'Last digest favored concise answers.' }] },
      downstream: 'prompt_template',
      mapping: { memory: '$.documents' },
    }),
    simpleNode('memory_write', 'Memory Write', 'Write durable workflow memory.', 'ai_primitive', 'BookPlus', anyIn, 'json', {
      required: [field('memoryKey', 'string', 'Memory namespace.', { required: true }), field('contentPath', 'string', 'Content mapping.', { required: true })],
      optional: [field('policy', 'select', 'Flush policy.', { defaultValue: 'on_success', options: ['on_success', 'checkpoint'] })],
      config: { memoryKey: 'workspace:arena-digests', contentPath: '$.summary', policy: 'checkpoint', metadata: { source: 'weekly_digest' } },
      output: { written: true, memoryKey: 'workspace:arena-digests' },
      downstream: 'logger',
      mapping: { message: '$.memoryKey' },
    }),
    simpleNode('chain', 'Chain', 'Run a configured AI chain of prompt, model, and parser steps.', 'ai_primitive', 'Link', anyIn, 'json', {
      required: [field('steps', 'json', 'Chain step definitions.', { required: true })],
      config: { steps: [{ type: 'prompt_template', template: 'Summarize {{input}}' }, { type: 'lens_execute', model_id: 'openai:gpt-4.1-mini' }, { type: 'output_parser', schema: { summary: 'string' } }] },
      output: { summary: 'PR changes add catalog-backed workflow nodes.' },
      downstream: 'slack_notify',
      mapping: { text: '$.summary' },
    }),
    simpleNode('summarizer', 'Summarizer', 'Summarize text or documents using a selected model.', 'ai_primitive', 'ScrollText', [io('content', 'document[]', 'Documents or text to summarize.', { required: true })], 'text', aiSimpleConfig('summary', 'weekly digest email', 'email_send')),
    simpleNode('classifier', 'Classifier', 'Classify text into configured labels.', 'ai_primitive', 'Tags', textIn, 'json', aiSimpleConfig('classification', 'PR risk routing', 'switch')),
    simpleNode('translator', 'Translator', 'Translate text into a target language.', 'ai_primitive', 'Languages', textIn, 'text', aiSimpleConfig('translation', 'localized founder note', 'notion_write')),
    simpleNode('image_analyze', 'Image Analyze', 'Analyze an image and return structured observations.', 'ai_primitive', 'Image', [io('image', 'image', 'Image input.', { required: true })], 'json', aiSimpleConfig('image analysis', 'media moderation review', 'judge_evaluator')),
    simpleNode('audio_transcribe', 'Audio Transcribe', 'Transcribe audio into text with timestamps.', 'ai_primitive', 'Mic', [io('audio', 'audio', 'Audio input.', { required: true })], 'text', aiSimpleConfig('transcription', 'meeting summary pipeline', 'summarizer')),
    simpleNode('video_analyze', 'Video Analyze', 'Analyze video frames and transcript into structured notes.', 'ai_primitive', 'Video', [io('video', 'video', 'Video input.', { required: true })], 'json', aiSimpleConfig('video analysis', 'battle replay review', 'summarizer')),
  ]
}

function battleNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('battle_create', 'Battle Create', 'Create a battle definition from prompt and contenders.', 'battle', 'Swords', jsonIn, 'json', battleOpts('battleId', { title: 'RAG answer showdown', visibility: 'workspace' }, { battleId: 'battle_123', status: 'draft' }, 'battle_execute')),
    defineNode({
      type: 'battle_execute',
      displayName: 'Battle Execute',
      description: 'Execute contenders and judge strategy for a battle.',
      category: 'battle',
      iconKey: 'Zap',
      inputs: [io('prompt', 'text', 'Battle prompt.', { required: true }), io('contenders', 'array', 'Contender definitions.', { required: true })],
      outputs: [io('battleResult', 'battle_result', 'Winner, scores, and contender outputs.', { shape: { battleId: 'text', winner: 'text', scores: 'json' } })],
      requiredConfig: [field('contenders', 'json', 'Contender lens or agent configs.', { required: true }), field('judgeStrategy', 'select', 'Judge strategy.', { required: true, options: ['single_judge', 'panel', 'vote'] })],
      optionalConfig: [field('promptSource', 'string', 'Prompt mapping.'), field('fundingSource', 'select', 'Funding source.', { defaultValue: 'platform_credit', options: ['platform_credit', 'user_byok_cloud', 'user_byok_local'] }), field('resultVisibility', 'select', 'Result visibility.', { defaultValue: 'workspace', options: ['private', 'workspace', 'public'] })],
      defaultConfig: { judgeStrategy: 'single_judge', fundingSource: 'platform_credit', resultVisibility: 'workspace' },
      exampleConfig: example(
        'Run two RAG-answer contenders and produce a judged winner.',
        { contenders: [{ id: 'concise', lensId: 'lens_concise_answer' }, { id: 'sourced', lensId: 'lens_sourced_answer' }], promptSource: '$.prompt', judgeStrategy: 'panel', fundingSource: 'platform_credit', resultVisibility: 'workspace', retry: { attempts: 2, backoffMs: 2000 } },
        { prompt: 'Which catalog changes are needed for Email Send?', contenders: ['concise', 'sourced'] },
        { battleId: 'battle_123', winner: 'sourced', scores: { sourced: 94, concise: 78 }, resultVisibility: 'workspace' },
        'leaderboard_update',
        { battleId: '$.battleId', winner: '$.winner', scores: '$.scores' },
      ),
      acceptsInputTypes: ['text', 'json', 'array'],
      producesOutputType: 'battle_result',
      funding: ['platform_credit', 'user_byok_cloud', 'user_byok_local'],
    }),
    simpleNode('contender_run', 'Contender Run', 'Run one battle contender against a prompt.', 'battle', 'UserRound', textIn, 'lens_result', battleOpts('contenderId', { contenderId: 'sourced', lensId: 'lens_sourced_answer', model_id: 'openai:gpt-4.1-mini' }, { contenderId: 'sourced', output: 'Answer with citations...' }, 'judge_battle')),
    simpleNode('judge_battle', 'Judge Battle', 'Judge contender outputs and emit a battle result.', 'battle', 'Scale', jsonIn, 'battle_result', battleOpts('rubric', { rubric: 'Prefer correctness and source coverage.', judgeModel: 'anthropic:claude-3-7-sonnet' }, { winner: 'sourced', scores: { sourced: 94, concise: 78 } }, 'score_aggregator')),
    simpleNode('vote_collector', 'Vote Collector', 'Collect human or automated votes for a battle.', 'battle', 'Vote', jsonIn, 'json', battleOpts('battleId', { battleId: '$.battleId', closeAfterVotes: 7 }, { votes: [{ voter: 'u1', contenderId: 'sourced' }] }, 'score_aggregator')),
    simpleNode('score_aggregator', 'Score Aggregator', 'Aggregate judge scores and votes into final rankings.', 'battle', 'Trophy', jsonIn, 'battle_result', battleOpts('aggregation', { aggregation: 'weighted_average', weights: { judge: 0.8, vote: 0.2 } }, { winner: 'sourced', finalScore: 91.6 }, 'leaderboard_update')),
    simpleNode('leaderboard_update', 'Leaderboard Update', 'Write battle results to a leaderboard.', 'battle', 'ListOrdered', [io('battleResult', 'battle_result', 'Battle result to publish.', { required: true })], 'json', battleOpts('leaderboardId', { leaderboardId: 'arena_weekly', scorePath: '$.finalScore', visibility: 'workspace' }, { updated: true, rank: 1 }, 'slack_notify')),
  ]
}

function storageNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('supabase_query', 'Supabase Query', 'Run an allowed Supabase RPC or table query.', 'storage', 'Database', jsonIn, 'json', storageOpts('rpcName', { rpcName: 'workflows.fn_recent_battle_results', params: { window: '7d' } }, { rows: [{ battleId: 'battle_123', winner: 'sourced' }] }, 'aggregate', 'n8n-nodes-base.supabase')),
    simpleNode('sql_query', 'SQL Query', 'Run a parameterized SQL query in an approved environment.', 'storage', 'TableProperties', jsonIn, 'json', storageOpts('query', { query: 'select title, winner from arena.battles where created_at >= :since', params: { since: '$.firedAt' } }, { rows: [{ title: 'RAG showdown', winner: 'sourced' }] }, 'data_mapper')),
    simpleNode('kv_store_read', 'KV Read', 'Read a value from workflow KV storage.', 'storage', 'KeyRound', anyIn, 'json', storageOpts('key', { key: 'digest:lastSuccessfulRun' }, { value: '2026-05-09T08:00:00Z' }, 'supabase_query')),
    simpleNode('kv_store_write', 'KV Write', 'Write a value to workflow KV storage.', 'storage', 'Save', anyIn, 'json', storageOpts('key', { key: 'digest:lastSuccessfulRun', valuePath: '$.completedAt', ttlSeconds: 604800 }, { written: true }, 'logger')),
    simpleNode('file_reader', 'File Reader', 'Read text or binary file content from a URL or storage object.', 'storage', 'FileInput', anyIn, 'file', storageOpts('source', { source: 'object-storage', bucket: 'workflow-inputs', objectKey: '$.fileKey' }, { file: { url: 'https://storage.example.com/report.pdf', mimeType: 'application/pdf' } }, 'media_convert')),
    simpleNode('file_writer', 'File Writer', 'Write text, JSON, or binary output to a file destination.', 'storage', 'FileOutput', anyIn, 'file', storageOpts('destination', { destination: 'object-storage', bucket: 'workflow-outputs', objectKeyTemplate: 'digests/{{runId}}.md', contentPath: '$.summary' }, { file: { url: 'https://storage.example.com/digests/run_1.md', mimeType: 'text/markdown' } }, 'email_send')),
    simpleNode('object_storage_upload', 'Object Storage Upload', 'Upload a file to object storage.', 'storage', 'UploadCloud', [io('file', 'file', 'File to upload.', { required: true })], 'file', storageOpts('bucket', { bucket: 'workflow-artifacts', objectKeyTemplate: 'media/{{runId}}/{{filename}}', filePath: '$.file.url' }, { file: { url: 'https://storage.example.com/media/run_1/image.png' } }, 'slack_notify')),
    simpleNode('object_storage_download', 'Object Storage Download', 'Download a file from object storage.', 'storage', 'DownloadCloud', jsonIn, 'file', storageOpts('bucket', { bucket: 'workflow-artifacts', objectKey: '$.objectKey' }, { file: { url: 'blob:downloaded', mimeType: 'image/png' } }, 'image_analyze')),
    simpleNode('webhook_sender', 'Webhook Send', 'Send an outbound webhook request.', 'storage', 'Webhook', jsonIn, 'json', storageOpts('url', { url: 'https://hooks.example.com/lenserfight', method: 'POST', bodyPath: '$' }, { status: 202, responseBody: { accepted: true } }, 'logger', 'n8n-nodes-base.httpRequest')),
    simpleNode('http_request', 'HTTP Request', 'Call an HTTP endpoint and return response data.', 'storage', 'Globe', anyIn, 'json', storageOpts('url', { url: 'https://api.github.com/repos/org/repo/pulls/42', method: 'GET', headers: { Authorization: 'Bearer {{secrets.github}}' } }, { status: 200, body: { title: 'Add catalog' } }, 'github_pr_review', 'n8n-nodes-base.httpRequest')),
    simpleNode('graphql_request', 'GraphQL Request', 'Call a GraphQL endpoint with variables.', 'storage', 'Network', jsonIn, 'json', storageOpts('query', { endpoint: 'https://api.github.com/graphql', query: 'query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){pullRequests(first:5){nodes{title}}}}', variables: { owner: 'ofcskn', repo: 'lenserfight-web' } }, { data: { repository: { pullRequests: { nodes: [{ title: 'Workflow catalog' }] } } } }, 'summarizer', 'n8n-nodes-base.graphql')),
  ]
}

function communicationNodes(): WorkflowNodeCatalogEntry[] {
  return [
    defineNode({
      type: 'email_send',
      displayName: 'Email Send',
      description: 'Send an email with mapped subject, body, recipients, and attachments.',
      category: 'communication',
      iconKey: 'Mail',
      inputs: [io('message', 'text', 'Body text.'), io('payload', 'json', 'Structured data for templates.'), io('attachments', 'file', 'Optional attachments.')],
      outputs: [io('delivery', 'json', 'Delivery status and provider message id.', { shape: { status: 'text', messageId: 'text', provider: 'text' } })],
      requiredConfig: [field('to', 'string', 'Recipient email or mapping.', { required: true }), field('subject', 'template', 'Subject template.', { required: true }), field('body', 'template', 'Body template.', { required: true })],
      optionalConfig: [field('fromProfile', 'string', 'Sender profile.', { defaultValue: 'default' }), field('attachments', 'json', 'Attachment mappings.'), field('provider', 'select', 'Delivery provider.', { defaultValue: 'resend', options: ['resend', 'smtp'] }), field('retry', 'json', 'Retry policy.')],
      defaultConfig: { fromProfile: 'default', provider: 'resend', retry: { attempts: 3, backoffMs: 2000 } },
      exampleConfig: example(
        'Send the weekly AI digest to founders.',
        { fromProfile: 'founder-updates', to: '{{workspace.owner.email}}', subject: 'LenserFight weekly AI digest - {{formatDate $.firedAt}}', body: '{{$.summary}}', attachments: [{ name: 'leaderboard.csv', filePath: '$.leaderboardFile.url' }], provider: 'resend', retry: { attempts: 3, backoffMs: 2000 }, onParentFailure: 'propagate' },
        { summary: 'Top battles and model changes...', leaderboardFile: { url: 'https://storage.example.com/leaderboard.csv' } },
        { status: 'sent', messageId: 'resend_abc123', provider: 'resend' },
        'logger',
        { message: '$.messageId' },
      ),
      acceptsInputTypes: ['text', 'json', 'object', 'file'],
      producesOutputType: 'json',
      environments: ['worker', 'server'],
      n8n: n8n('n8n-nodes-base.emailSend'),
    }),
    simpleNode('slack_notify', 'Slack Notify', 'Send a Slack message to a channel.', 'communication', 'MessageSquare', anyIn, 'json', commOpts('channel', { channel: '#arena-alerts', text: 'Battle {{$.battleId}} winner: {{$.winner}}', provider: 'slack' }, { status: 'sent', ts: '1715850000.000100' }, 'logger', 'n8n-nodes-base.slack')),
    simpleNode('discord_notify', 'Discord Notify', 'Send a Discord message through a webhook.', 'communication', 'MessagesSquare', anyIn, 'json', commOpts('webhookUrl', { webhookUrl: '{{secrets.discordArenaWebhook}}', content: 'New battle result: {{$.winner}}' }, { status: 'sent', messageId: 'discord_123' }, 'logger', 'n8n-nodes-base.discord')),
    simpleNode('telegram_notify', 'Telegram Notify', 'Send a Telegram chat message.', 'communication', 'Send', anyIn, 'json', commOpts('chatId', { chatId: '{{secrets.telegramOpsChat}}', text: 'Workflow failed: {{$.error.message}}' }, { status: 'sent', messageId: 'tg_123' }, 'logger', 'n8n-nodes-base.telegram')),
    simpleNode('push_notification', 'Push Notification', 'Send an in-app or device push notification.', 'communication', 'Bell', anyIn, 'json', commOpts('audience', { audience: 'workspace_admins', title: 'Digest ready', body: '{{$.summaryTitle}}' }, { status: 'queued', notificationId: 'push_123' }, 'logger')),
    simpleNode('sms_send', 'SMS Send', 'Send an SMS alert through the configured provider.', 'communication', 'Smartphone', anyIn, 'json', commOpts('to', { to: '{{workspace.owner.phone}}', body: 'Critical workflow failed: {{$.workflowName}}' }, { status: 'sent', messageId: 'sms_123' }, 'logger', 'n8n-nodes-base.twilio')),
  ]
}

function integrationNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('github_read', 'GitHub Read', 'Read repository, pull request, issue, or file data from GitHub.', 'integration', 'Github', jsonIn, 'json', integrationOpts('repository', { repository: 'ofcskn/lenserfight-web', resource: 'pull_request', prNumber: 42 }, { pullRequest: { title: 'Add workflow catalog', files: 12 } }, 'github_pr_review', 'n8n-nodes-base.github')),
    simpleNode('github_pr_review', 'GitHub PR Review', 'Create or draft a GitHub pull request review from analysis output.', 'integration', 'GitPullRequest', jsonIn, 'json', integrationOpts('repository', { repository: 'ofcskn/lenserfight-web', prNumber: '$.pullRequest.number', reviewBody: '$.summary', event: 'COMMENT' }, { status: 'submitted', reviewId: 'PRR_kwDO' }, 'slack_notify', 'n8n-nodes-base.github')),
    simpleNode('github_issue_create', 'GitHub Issue Create', 'Create a GitHub issue from workflow output.', 'integration', 'CircleDot', jsonIn, 'json', integrationOpts('repository', { repository: 'ofcskn/lenserfight-web', title: 'Workflow catalog validation failure', body: '$.reasoning', labels: ['workflow', 'automation'] }, { issueNumber: 128, url: 'https://github.com/ofcskn/lenserfight-web/issues/128' }, 'slack_notify', 'n8n-nodes-base.github')),
    simpleNode('rss_feed', 'RSS Feed', 'Fetch RSS feed items.', 'integration', 'Rss', anyIn, 'json', integrationOpts('feedUrl', { feedUrl: 'https://github.blog/feed/', limit: 10, since: '$.lastSuccessfulRun' }, { items: [{ title: 'Actions update', link: 'https://github.blog/...' }] }, 'summarizer', 'n8n-nodes-base.rssFeedRead')),
    simpleNode('notion_read', 'Notion Read', 'Read Notion pages or database rows.', 'integration', 'NotebookText', jsonIn, 'json', integrationOpts('databaseId', { databaseId: '{{secrets.notionDigestDb}}', filter: { property: 'Status', equals: 'Ready' } }, { results: [{ title: 'Arena notes' }] }, 'summarizer', 'n8n-nodes-base.notion')),
    simpleNode('notion_write', 'Notion Write', 'Write a Notion page or database row.', 'integration', 'NotebookPen', jsonIn, 'json', integrationOpts('databaseId', { databaseId: '{{secrets.notionDigestDb}}', properties: { Name: '$.title', Summary: '$.summary' } }, { pageId: 'notion_page_123', url: 'https://notion.so/...' }, 'slack_notify', 'n8n-nodes-base.notion')),
    simpleNode('google_sheets_read', 'Sheets Read', 'Read rows from a Google Sheet.', 'integration', 'Sheet', jsonIn, 'array', integrationOpts('spreadsheetId', { spreadsheetId: '{{secrets.weeklyMetricsSheet}}', sheetName: 'Battle Metrics', range: 'A2:G200', valueRenderOption: 'FORMATTED_VALUE' }, { rows: [{ battleId: 'battle_123', score: 91 }] }, 'aggregate', 'n8n-nodes-base.googleSheets')),
    simpleNode('google_sheets_write', 'Sheets Write', 'Append or update rows in a Google Sheet.', 'integration', 'Table2', jsonIn, 'json', integrationOpts('spreadsheetId', { spreadsheetId: '{{secrets.weeklyMetricsSheet}}', sheetName: 'Digest Log', operation: 'append', rowsPath: '$.rows' }, { updatedRows: 3, spreadsheetId: 'sheet_123' }, 'logger', 'n8n-nodes-base.googleSheets')),
    simpleNode('calendar_create', 'Calendar Create', 'Create a calendar event.', 'integration', 'CalendarPlus', jsonIn, 'json', integrationOpts('calendarId', { calendarId: 'primary', title: 'Arena digest review', start: '2026-05-18T10:00:00+03:00', end: '2026-05-18T10:30:00+03:00', attendees: ['founder@example.com'] }, { eventId: 'cal_123', htmlLink: 'https://calendar.google.com/...' }, 'slack_notify', 'n8n-nodes-base.googleCalendar')),
    simpleNode('linear_issue_create', 'Linear Issue Create', 'Create a Linear issue.', 'integration', 'CircleDotDashed', jsonIn, 'json', integrationOpts('teamId', { teamId: '{{secrets.linearTeamId}}', title: 'Investigate low-confidence judge result', description: '$.reasoning', priority: 2 }, { issueId: 'LIN-321', url: 'https://linear.app/...' }, 'slack_notify', 'n8n-nodes-base.linear')),
    simpleNode('jira_issue_create', 'Jira Issue Create', 'Create a Jira issue.', 'integration', 'Ticket', jsonIn, 'json', integrationOpts('projectKey', { projectKey: 'LF', issueType: 'Task', summary: 'Workflow validation warning', description: '$.warning' }, { issueKey: 'LF-42', url: 'https://jira.example.com/browse/LF-42' }, 'slack_notify', 'n8n-nodes-base.jira')),
  ]
}

function mediaNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('text_to_image', 'Text to Image', 'Generate an image from text.', 'media', 'ImagePlus', textIn, 'image', mediaOpts('model', { provider: 'fal-ai', model: 'fal-ai/flux/dev', promptPath: '$.prompt', size: '1024x1024' }, { image: { url: 'blob:image', mimeType: 'image/png' } }, 'object_storage_upload')),
    simpleNode('image_to_image', 'Image to Image', 'Transform an input image with a prompt.', 'media', 'Images', [io('image', 'image', 'Source image.', { required: true }), io('prompt', 'text', 'Edit prompt.')], 'image', mediaOpts('model', { provider: 'fal-ai', model: 'fal-ai/flux-pro/kontext', imagePath: '$.image.url', prompt: 'Create a polished arena card' }, { image: { url: 'blob:edited', mimeType: 'image/png' } }, 'object_storage_upload')),
    simpleNode('image_to_audio', 'Image to Audio', 'Generate audio from an image description workflow.', 'media', 'Volume2', [io('image', 'image', 'Image input.', { required: true })], 'audio', mediaOpts('model', { provider: 'fal-ai', model: 'fal-ai/stable-audio', imagePath: '$.image.url', prompt: 'Ambient intro for the battle replay' }, { audio: { url: 'blob:audio', mimeType: 'audio/mpeg' } }, 'object_storage_upload')),
    simpleNode('text_to_speech', 'Text to Speech', 'Generate spoken audio from text.', 'media', 'Speech', textIn, 'audio', mediaOpts('voice', { provider: 'openai', model: 'gpt-4o-mini-tts', voice: 'alloy', textPath: '$.summary' }, { audio: { url: 'blob:tts', mimeType: 'audio/mpeg' } }, 'object_storage_upload')),
    simpleNode('speech_to_text', 'Speech to Text', 'Transcribe speech audio into text.', 'media', 'Mic2', [io('audio', 'audio', 'Audio input.', { required: true })], 'text', mediaOpts('model', { provider: 'openai', model: 'gpt-4o-transcribe', audioPath: '$.audio.url' }, { text: 'The battle winner is...' }, 'summarizer')),
    simpleNode('text_to_video', 'Text to Video', 'Generate a video from text.', 'media', 'Clapperboard', textIn, 'video', mediaOpts('model', { provider: 'fal-ai', model: 'fal-ai/veo3', promptPath: '$.prompt', durationSeconds: 8, aspectRatio: '16:9' }, { video: { url: 'blob:video', mimeType: 'video/mp4' } }, 'object_storage_upload')),
    simpleNode('image_upscale', 'Image Upscale', 'Upscale an image artifact.', 'media', 'Maximize', [io('image', 'image', 'Image to upscale.', { required: true })], 'image', mediaOpts('scale', { provider: 'fal-ai', model: 'fal-ai/esrgan', imagePath: '$.image.url', scale: 2 }, { image: { url: 'blob:upscaled', mimeType: 'image/png' } }, 'object_storage_upload')),
    simpleNode('media_convert', 'Media Convert', 'Convert media between supported formats.', 'media', 'RefreshCcw', [io('file', 'file', 'File or media artifact.', { required: true })], 'file', mediaOpts('targetFormat', { targetFormat: 'mp3', inputPath: '$.file.url', audioBitrate: '128k' }, { file: { url: 'blob:converted', mimeType: 'audio/mpeg' } }, 'object_storage_upload')),
  ]
}

function utilityNodes(): WorkflowNodeCatalogEntry[] {
  return [
    simpleNode('logger', 'Logger', 'Write a structured log entry for debugging and audit trails.', 'utility', 'Logs', anyIn, 'json', utilityOpts('message', { level: 'info', message: 'Digest delivered: {{$.messageId}}', includeInput: true }, { logged: true, level: 'info' })),
    simpleNode('debug_inspector', 'Debug Inspector', 'Expose upstream payload shape in manual executions.', 'utility', 'Bug', anyIn, 'json', utilityOpts('capturePaths', { capturePaths: ['$', '$.documents[0].metadata'], redactSecrets: true }, { inspection: { keys: ['documents', 'summary'] } })),
    simpleNode('secret_resolver', 'Secret Resolver', 'Resolve a named secret reference for downstream server-side nodes.', 'utility', 'Key', anyIn, 'json', utilityOpts('secretRef', { secretRef: 'github-api-token', exposeAs: 'githubToken' }, { githubToken: '{{resolved-secret-ref}}' })),
    simpleNode('rate_limit', 'Rate Limit', 'Throttle workflow items by key and limit.', 'utility', 'Gauge', anyIn, 'json', utilityOpts('limit', { key: 'github-api', limit: 30, windowSeconds: 60 }, { allowed: true, remaining: 29 })),
    simpleNode('cache_read', 'Cache Read', 'Read cached data by key.', 'utility', 'ArchiveRestore', anyIn, 'json', utilityOpts('key', { key: 'rss:github-blog:last-summary' }, { hit: true, value: { summary: '...' } })),
    simpleNode('cache_write', 'Cache Write', 'Write data to cache by key and TTL.', 'utility', 'Archive', anyIn, 'json', utilityOpts('key', { key: 'rss:github-blog:last-summary', valuePath: '$.summary', ttlSeconds: 3600 }, { written: true })),
    simpleNode('retry', 'Retry', 'Retry an upstream operation branch with a configured policy.', 'utility', 'RotateCcw', anyIn, 'json', utilityOpts('attempts', { attempts: 3, backoffMs: 2000, retryOn: ['timeout', 'rate_limit'] }, { attempts: 2, succeeded: true })),
    simpleNode('noop', 'No-Op', 'Pass input through unchanged.', 'utility', 'Minus', anyIn, 'any', utilityOpts('label', { label: 'placeholder while designing PR review workflow' }, { output: 'unchanged' })),
  ]
}

interface SimpleOptions {
  required?: WorkflowNodeConfigField[]
  optional?: WorkflowNodeConfigField[]
  config: Record<string, unknown>
  output: Record<string, unknown>
  downstream?: WorkflowCatalogNodeType
  mapping?: Record<string, string>
  n8nNode?: string
  capabilities?: string[]
}

function simpleNode(
  type: WorkflowCatalogNodeType,
  displayName: string,
  description: string,
  category: WorkflowNodeCategory,
  iconKey: string,
  inputs: WorkflowNodeSchemaField[],
  producesOutputType: WorkflowNodeIOType,
  options: SimpleOptions,
): WorkflowNodeCatalogEntry {
  const downstream = options.downstream ?? 'logger'
  const outputName = producesOutputType === 'text' ? 'text' : producesOutputType === 'array' ? 'items' : 'result'
  return defineNode({
    type,
    displayName,
    description,
    category,
    iconKey,
    inputs,
    outputs: [io(outputName, producesOutputType, `${displayName} output.`, { shape: inferShape(options.output) })],
    requiredConfig: options.required ?? [],
    optionalConfig: options.optional ?? [],
    defaultConfig: Object.fromEntries((options.optional ?? []).filter((cfg) => cfg.defaultValue !== undefined).map((cfg) => [cfg.key, cfg.defaultValue])),
    exampleConfig: example(
      `${displayName} in a LenserFight workflow.`,
      options.config,
      sampleInputFor(inputs),
      options.output,
      downstream,
      options.mapping ?? { input: '$' },
    ),
    acceptsInputTypes: inferAcceptedTypes(inputs),
    producesOutputType,
    capabilities: options.capabilities ?? [category, displayName.toLowerCase()],
    n8n: options.n8nNode ? n8n(options.n8nNode) : undefined,
  })
}

function dataOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType, n8nNode?: string): SimpleOptions {
  return {
    required: [field(requiredKey, requiredKey === 'variables' || requiredKey === 'mapping' || requiredKey === 'renames' || requiredKey === 'metrics' ? 'json' : 'string', `${toTitle(requiredKey)} configuration.`, { required: true })],
    config,
    output,
    downstream,
    mapping: { input: '$' },
    n8nNode,
    capabilities: ['data', 'transform', requiredKey],
  }
}

function aiSimpleConfig(kind: string, scenario: string, downstream: WorkflowCatalogNodeType): SimpleOptions {
  return {
    required: [field('model', 'string', 'Model key.', { required: true })],
    optional: [field('inputPath', 'string', 'Input mapping.', { defaultValue: '$' }), field('provider', 'select', 'Provider.', { defaultValue: 'openai', options: ['openai', 'anthropic', 'google', 'fal-ai'] })],
    config: { provider: 'openai', model: 'gpt-4.1-mini', inputPath: '$', instructions: `Create ${kind} for ${scenario}.` },
    output: kind === 'classification' ? { label: 'high_risk', confidence: 0.87 } : { text: `Generated ${kind} for ${scenario}.` },
    downstream,
    mapping: { input: '$' },
    capabilities: ['ai', kind],
  }
}

function battleOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType): SimpleOptions {
  return {
    required: [field(requiredKey, 'string', `${toTitle(requiredKey)} for battle automation.`, { required: true })],
    optional: [field('visibility', 'select', 'Result visibility.', { defaultValue: 'workspace', options: ['private', 'workspace', 'public'] })],
    config,
    output,
    downstream,
    mapping: { battle: '$' },
    capabilities: ['battle', 'arena'],
  }
}

function storageOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType, n8nNode?: string): SimpleOptions {
  return {
    required: [field(requiredKey, requiredKey === 'query' || requiredKey === 'params' ? 'template' : 'string', `${toTitle(requiredKey)} for storage operation.`, { required: true })],
    optional: [field('timeoutMs', 'number', 'Request timeout.', { defaultValue: 15000 }), field('retry', 'json', 'Retry policy.', { defaultValue: { attempts: 2, backoffMs: 1000 } })],
    config,
    output,
    downstream,
    mapping: { input: '$' },
    n8nNode,
    capabilities: ['storage', 'io'],
  }
}

function commOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType, n8nNode?: string): SimpleOptions {
  return {
    required: [field(requiredKey, 'string', `${toTitle(requiredKey)} destination.`, { required: true }), field('text', 'template', 'Message template.', { required: requiredKey !== 'webhookUrl' })],
    optional: [field('provider', 'string', 'Provider profile.'), field('retry', 'json', 'Retry policy.', { defaultValue: { attempts: 3, backoffMs: 2000 } })],
    config,
    output,
    downstream,
    mapping: { message: '$' },
    n8nNode,
    capabilities: ['notify', 'communication'],
  }
}

function integrationOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType, n8nNode?: string): SimpleOptions {
  return {
    required: [field(requiredKey, 'string', `${toTitle(requiredKey)} integration setting.`, { required: true })],
    optional: [field('credentialsRef', 'secret', 'Credential reference.'), field('timeoutMs', 'number', 'Request timeout.', { defaultValue: 20000 })],
    config,
    output,
    downstream,
    mapping: { input: '$' },
    n8nNode,
    capabilities: ['integration', requiredKey],
  }
}

function mediaOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>, downstream: WorkflowCatalogNodeType): SimpleOptions {
  return {
    required: [field(requiredKey, 'string', `${toTitle(requiredKey)} for media generation.`, { required: true })],
    optional: [field('provider', 'select', 'Media provider.', { defaultValue: 'fal-ai', options: ['fal-ai', 'openai'] }), field('fundingSource', 'select', 'Funding source.', { defaultValue: 'platform_credit', options: ['platform_credit', 'user_byok_cloud', 'user_byok_local'] })],
    config,
    output,
    downstream,
    mapping: { file: '$' },
    capabilities: ['media', 'generation'],
  }
}

function utilityOpts(requiredKey: string, config: Record<string, unknown>, output: Record<string, unknown>): SimpleOptions {
  return {
    required: [field(requiredKey, requiredKey === 'capturePaths' ? 'string[]' : 'string', `${toTitle(requiredKey)} for utility node.`, { required: true })],
    optional: [field('enabled', 'boolean', 'Enable node.', { defaultValue: true })],
    config,
    output,
    downstream: 'noop',
    mapping: { input: '$' },
    capabilities: ['utility', 'debug'],
  }
}

function inferAcceptedTypes(inputs: WorkflowNodeSchemaField[]): WorkflowNodeIOType[] {
  const accepted = inputs.map((input) => input.type)
  return accepted.includes('any') ? ['any'] : [...new Set(accepted)]
}

function sampleInputFor(inputs: WorkflowNodeSchemaField[]): Record<string, unknown> {
  return Object.fromEntries(inputs.map((input) => [input.name, sampleValue(input.type)]))
}

function sampleValue(type: WorkflowNodeIOType): unknown {
  switch (type) {
    case 'text':
      return 'Summarize this LenserFight workflow result.'
    case 'json':
    case 'object':
    case 'any':
      return { workflowId: 'wf_digest', status: 'ready' }
    case 'array':
      return [{ id: 'item_1', score: 0.91 }]
    case 'number':
      return 42
    case 'boolean':
      return true
    case 'image':
      return { url: 'https://media.example.com/arena-card.png', mimeType: 'image/png' }
    case 'audio':
      return { url: 'https://media.example.com/voiceover.mp3', mimeType: 'audio/mpeg' }
    case 'video':
      return { url: 'https://media.example.com/replay.mp4', mimeType: 'video/mp4' }
    case 'file':
      return { url: 'https://storage.example.com/report.pdf', mimeType: 'application/pdf' }
    case 'embedding':
      return { vector: [0.013, -0.024, 0.071], dimensions: 1536 }
    case 'document[]':
      return [{ pageContent: 'Arena rules and judging rubric.', metadata: { source: 'rubric.md' } }]
    case 'battle_result':
      return { battleId: 'battle_123', winner: 'sourced' }
    case 'lens_result':
      return { text: 'Lens output', modelId: 'openai:gpt-4.1-mini' }
    case 'agent_result':
      return { status: 'completed', summary: 'Agent finished review.' }
    case 'workflow_result':
      return { status: 'completed', output: 'Workflow returned.' }
    case 'error':
      return { message: 'Provider timeout', nodeId: 'node_1' }
    case 'void':
      return null
  }
}

function inferShape(value: Record<string, unknown>): Record<string, WorkflowNodeIOType | string> {
  return Object.fromEntries(Object.entries(value).map(([key, val]) => [key, inferType(val)]))
}

function inferType(value: unknown): WorkflowNodeIOType | string {
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'string') return 'text'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value && typeof value === 'object') return 'json'
  return 'any'
}

function toTitle(key: string): string {
  return key
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
