export {
  WORKFLOW_PROTOCOL_ID,
  SUPPORTED_WORKFLOW_PROTOCOL_IDS,
  WORKFLOW_STEP_KINDS,
  WORKFLOW_ENTRY_KINDS,
  MIN_WORKFLOW_TITLE_LENGTH,
  MAX_WORKFLOW_TITLE_LENGTH,
  CONNECTION_ENDPOINT_PATTERN,
  CRON_FIELD_COUNT,
  workflowDocumentSchema,
  workflowStepSchema,
  workflowConnectionSchema,
  workflowScheduleSchema,
  lensDefinitionSchema,
  lensParameterDefinitionSchema,
  parseConnectionEndpoint,
  formatConnectionEndpoint,
} from './lib/workflow-protocol.schema'

export type {
  WorkflowDocument,
  WorkflowDocumentInput,
  WorkflowStep,
  WorkflowStepKind,
  WorkflowConnection,
  WorkflowSchedule,
  LensDefinition,
  LensParameterDefinition,
  ConnectionEndpoint,
} from './lib/workflow-protocol.schema'

export {
  protocolIssue,
  protocolFailure,
  protocolSuccess,
  hasBlockingIssue,
} from './lib/workflow-protocol.errors'

export type {
  WorkflowProtocolIssue,
  WorkflowProtocolIssueStage,
  WorkflowProtocolIssueSeverity,
  WorkflowProtocolResult,
} from './lib/workflow-protocol.errors'

export {
  WORKFLOW_DOCUMENT_FORMATS,
  jsonWorkflowDocumentAdapter,
  yamlWorkflowDocumentAdapter,
  getWorkflowDocumentAdapter,
  detectWorkflowDocumentFormat,
  stripCodeFence,
} from './lib/workflow-protocol.adapters'

export type {
  WorkflowDocumentFormat,
  WorkflowDocumentAdapter,
  DocumentParseResult,
} from './lib/workflow-protocol.adapters'

export { normalizeWorkflowDocument } from './lib/workflow-protocol.normalize'
export type { NormalizeResult } from './lib/workflow-protocol.normalize'

export { readWorkflowDocument, validateWorkflowDocument } from './lib/workflow-protocol.reader'
export type {
  ReadWorkflowDocumentOptions,
  ReadWorkflowDocumentResult,
} from './lib/workflow-protocol.reader'

export { writeWorkflowDocument, toCanonicalWorkflowObject } from './lib/workflow-protocol.writer'
