export type { IExecutionProvider, ExecutionInput, ExecutionResult, MediaType, WorkflowNodeType } from './lib/execution.types'
export type {
  IStreamingExecutionProvider,
  StreamChunk,
  PartialOutputSink,
  ModerationGateway,
  ModerationPhase,
  ModerationDecision,
} from './lib/execution.types'
export { validateInputs, validateOutput } from './lib/contract-validator'
export {
  validateWorkflow,
  detectCycle,
  PlaceholderUnboundError,
  TRIGGER_NODE_TYPES,
} from './lib/validator'
export { validateBrowserExecutionPlan } from './lib/execution-plan-validator'
export type { ExecutionPlanIssue, ExecutionPlanModel, ExecutionPlanNodeShape } from './lib/execution-plan-validator'
export { resolveMappedOutputValue } from './lib/output-path'
export {
  WORKFLOW_NODE_CATALOG,
  WORKFLOW_NODE_CATEGORIES,
  areWorkflowNodesCompatible,
  buildWorkflowNodeCardMetadata,
  getWorkflowNodeCatalogEntry,
  getWorkflowNodeCategoryColor,
  getWorkflowNodeCategoryCounts,
  getWorkflowNodeCategoryIcon,
  getWorkflowNodeCategoryLabel,
  getWorkflowNodeCompatibilityWarning,
  getWorkflowNodesByCategory,
  isWorkflowUtilityNodeType,
  normalizeWorkflowNodeConfigForExecution,
  searchWorkflowNodeCatalog,
  validateWorkflowNodeCatalog,
} from './lib/catalog'
export type {
  ExecutableWorkflowNodeConfig,
  WorkflowCatalogNodeType,
  WorkflowExecutionEnvironment,
  WorkflowFundingMode,
  WorkflowNodeCatalogEntry,
  WorkflowNodeCategory,
  WorkflowNodeConfigExample,
  WorkflowNodeConfigField,
  WorkflowNodeConfigKind,
  WorkflowNodeErrorBehavior,
  WorkflowNodeIOType,
  WorkflowNodeN8nMapping,
  WorkflowNodeRetryBehavior,
  WorkflowNodeSchemaField,
} from './lib/catalog'
export type {
  ValidationIssue,
  ValidationCode,
  ValidationResult,
  ValidationNodeShape,
  ValidationEdgeShape,
  ValidateWorkflowOptions,
} from './lib/validator'

// ── Phase 3 kernel seams ──────────────────────────────────────────────────
export { Scheduler } from './lib/scheduler'
export type { SchedulerEdge, SchedulerNode } from './lib/scheduler'
export {
  renderPrompt,
  replaceTokenVariants,
  resolveRenderedInputs,
  isEdgeConditionSatisfied,
} from './lib/prompt-resolver'
export type {
  ResolverEdge,
  ResolverNode,
  ResolverUpstreamResult,
} from './lib/prompt-resolver'
export { EventPublisher } from './lib/event-publisher'
export type { EnginePublishEvent, EventPublisherConfig } from './lib/event-publisher'
export { NodeRuntime, computeBackoff, envelopeToOutputData } from './lib/node-runtime'
export type {
  NodeRuntimeStatus,
  NodeRuntimeOutcome,
  NodeRuntimeInput,
  NodeRuntimeConfig,
  RetryPolicy,
} from './lib/node-runtime'
export { evaluateBudget, shouldHaltScheduling } from './lib/budget-reconciler'
export type { BudgetSnapshot, BudgetDecision } from './lib/budget-reconciler'
export { replayRunEvents } from './lib/replay'
export type {
  ReplayEvent,
  ReplayNodeState,
  ReplayState,
  ReplayOptions,
  WorkflowRunReplayStatus,
  NodeReplayStatus,
} from './lib/replay'
export { EchoProvider, echoProvider } from './lib/providers/echo.provider'
export { FalAIProvider } from './lib/providers/fal-ai.provider'
export { GeminiProvider } from './lib/providers/gemini.provider'
export { OpenAIProvider } from './lib/providers/openai.provider'
export { AnthropicProvider } from './lib/providers/anthropic.provider'
export { MistralProvider } from './lib/providers/mistral.provider'
export { OllamaProvider } from './lib/providers/ollama.provider'
export { PdfExportProvider } from './lib/providers/pdf-export.provider'
export { ResearchProvider } from './lib/providers/research.provider'
export type { ResearchRetrievalBackend, ResearchRetrievalHit } from './lib/providers/research.provider'
export { getExecutionProvider, registerExecutionProvider } from './lib/execution.registry'
export { chainabitExecutionClient } from './lib/chainabitExecutionClient'
export type { ChainbitSubmitPayload, ChainbitJobStatus } from './lib/chainabitExecutionClient'
export {
  WorkflowExecutionService,
  resolveDelegationPolicy,
  assertDelegationAllowed,
} from './lib/workflow-execution.service'
export type {
  WorkflowNode,
  WorkflowEdge,
  EdgeCondition,
  NodeStatus,
  NodeResult,
  WorkflowRunResult,
  WorkflowExecutionContext,
  WorkflowNodeConfig,
  RetryConfig,
  RetryCause,
  MergeStrategy,
  OnParentFailurePolicy,
  ModerationConfig,
  EngineEvent,
  EngineEventName,
  MemoryWritePolicy,
  MemoryFlushSink,
  DelegationPolicy,
  DelegationDispatcher,
  DEFAULT_MAX_USER_BUDGET_CREDITS,
} from './lib/workflow-execution.service'
export {
  SupabaseDelegationHandler,
  NullDelegationHandler,
} from './lib/delegation-handler'
export type {
  IDelegationHandler,
  DelegationDispatchInput,
  DelegationDispatchResult,
} from './lib/delegation-handler'

// ── CN: Node Runner system (GRASP Polymorphism) ──────────────────────────
export type { INodeRunner, NodeRunnerContext, NodeRunnerResult } from './lib/runners'
export { registerNodeRunner, getNodeRunner, hasNodeRunner, clearNodeRunners, registeredNodeTypes } from './lib/runners'
export { registerDefaultNodeRunners } from './lib/runners'
export { SetVariablesRunner, JsonTransformRunner, SwitchRunner, WaitDelayRunner, ErrorCatchRunner, LoopMapRunner, CodeNodeRunner, SubWorkflowRunner } from './lib/runners'
export type { SwitchCase, SwitchOperator } from './lib/runners'

// ── CO: AI Primitive Node Runners ────────────────────────────────────────
export { PromptTemplateRunner, OutputParserRunner, EmbeddingRunner, RagRetrievalRunner, JudgeEvaluatorRunner, MemoryReadRunner, MemoryWriteRunner, ChainRunner } from './lib/runners'

// ── CP: Storage & I/O Node Runners ──────────────────────────────────────
export { SupabaseQueryRunner, isRpcAllowed, KVStoreReadRunner, KVStoreWriteRunner, FileReaderRunner, FileWriterRunner, WebhookTriggerRunner, WebhookSenderRunner, ScheduleTriggerRunner } from './lib/runners'

// ── CQ: Communication & Integration Node Runners ────────────────────────
export { EmailSendRunner, SlackNotifyRunner, DiscordNotifyRunner, GitHubReadRunner, RssFeedRunner, NotionReadRunner, GoogleSheetsReadRunner, GoogleSheetsWriteRunner } from './lib/runners'
