/**
 * Import-boundary normalization.
 *
 * Older documents — anything produced before the protocol was formalised,
 * including the first generation of copy-paste workflow instructions — are
 * upgraded here rather than by a database migration. Runtime normalization is
 * sufficient because these documents only ever exist in transit.
 *
 * Everything this module does is reported as a warning, so the preview can
 * show the user exactly what was changed on their behalf.
 */
import { protocolIssue, type WorkflowProtocolIssue } from './workflow-protocol.errors'
import { WORKFLOW_PROTOCOL_ID } from './workflow-protocol.schema'

/**
 * Keys that carry internal or environment-specific meaning and must never
 * cross the portable boundary. Stripped with a warning rather than rejected,
 * because a model echoing `visibility` back is a predictable mistake and not
 * worth failing an otherwise valid import over.
 */
const NON_PORTABLE_DOCUMENT_KEYS = [
  'visibility',
  'id',
  'workflow_id',
  'workflowId',
  'lenser_id',
  'lenserId',
  'tenant_id',
  'tenantId',
  'user_id',
  'userId',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'credentials',
  'apiKey',
  'apiKeys',
  'secrets',
  'funding',
  'funding_source',
  'fundingSource',
] as const

const NON_PORTABLE_STEP_KEYS = [
  'id',
  'node_id',
  'nodeId',
  'lens_id',
  'lensId',
  'version_id',
  'versionId',
  'position',
  'position_x',
  'position_y',
  'selected',
  'credentials',
  'funding_source',
  'fundingSource',
  'key_ref_id',
  'local_key_id',
] as const

/**
 * The legacy instruction set asked models to append this marker when they were
 * unsure a node existed. It is advisory prose, not part of the name.
 */
const VERIFY_IN_PALETTE_PATTERN = /\s*\((?:verify in palette|verify)\)\s*$/i

export interface NormalizeResult {
  document: Record<string, unknown>
  issues: WorkflowProtocolIssue[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Upgrades a raw parsed value to the current protocol shape.
 *
 * Does not validate — that is `workflowDocumentSchema`'s job. This only
 * reshapes, so that validation sees a single canonical form.
 */
export function normalizeWorkflowDocument(raw: unknown): NormalizeResult {
  const issues: WorkflowProtocolIssue[] = []

  if (!isPlainObject(raw)) {
    return {
      document: {},
      issues: [
        protocolIssue(
          'structure',
          '',
          'Expected a single workflow object at the top level.',
        ),
      ],
    }
  }

  const document: Record<string, unknown> = { ...raw }

  // Legacy documents carry no protocol marker — adopt them as v1.
  if (document['protocol'] === undefined) {
    document['protocol'] = WORKFLOW_PROTOCOL_ID
    issues.push(
      protocolIssue(
        'structure',
        'protocol',
        `No protocol version found — read as "${WORKFLOW_PROTOCOL_ID}".`,
        'warning',
      ),
    )
  }

  stripNonPortableKeys(document, NON_PORTABLE_DOCUMENT_KEYS, '', issues)

  // `connections` is optional in legacy documents but always present after this.
  if (document['connections'] === undefined) {
    document['connections'] = []
  }

  if (Array.isArray(document['steps'])) {
    document['steps'] = document['steps'].map((step, index) =>
      normalizeStep(step, index, issues),
    )
  }

  if (Array.isArray(document['lenses'])) {
    document['lenses'] = document['lenses'].map((lens, index) =>
      normalizeLens(lens, index, issues),
    )
  }

  normalizeSchedule(document, issues)

  return { document, issues }
}

function normalizeStep(
  rawStep: unknown,
  index: number,
  issues: WorkflowProtocolIssue[],
): unknown {
  if (!isPlainObject(rawStep)) return rawStep
  const step: Record<string, unknown> = { ...rawStep }
  const path = `steps.${index}`

  stripNonPortableKeys(step, NON_PORTABLE_STEP_KEYS, path, issues)

  // Legacy steps used only trigger|lens|tool. `logic` was folded into `tool`,
  // which the catalog resolver can still disambiguate, so leave the value be.

  if (typeof step['name'] === 'string') {
    const cleaned = step['name'].replace(VERIFY_IN_PALETTE_PATTERN, '').trim()
    if (cleaned !== step['name']) {
      issues.push(
        protocolIssue(
          'structure',
          `${path}.name`,
          `Removed "(verify in palette)" marker from "${step['name']}" — the node is resolved against the live palette.`,
          'warning',
        ),
      )
      step['name'] = cleaned
    }
  }

  // A step numbered by position when the model omitted `step`.
  if (step['step'] === undefined) {
    step['step'] = index + 1
    issues.push(
      protocolIssue(
        'structure',
        `${path}.step`,
        `Step number missing — assigned ${index + 1} from document order.`,
        'warning',
      ),
    )
  }

  return step
}

function normalizeLens(
  rawLens: unknown,
  index: number,
  issues: WorkflowProtocolIssue[],
): unknown {
  if (!isPlainObject(rawLens)) return rawLens
  const lens: Record<string, unknown> = { ...rawLens }
  const path = `lenses.${index}`

  stripNonPortableKeys(lens, NON_PORTABLE_STEP_KEYS, path, issues)

  // `content` was the older name for the prompt body.
  if (lens['instructions'] === undefined && typeof lens['content'] === 'string') {
    lens['instructions'] = lens['content']
    delete lens['content']
    issues.push(
      protocolIssue(
        'structure',
        `${path}.content`,
        'Renamed legacy "content" field to "instructions".',
        'warning',
      ),
    )
  }

  return lens
}

/**
 * Accepts the three schedule spellings seen in the wild and folds them into
 * the single `schedule` object. Activation is never inferred — an imported
 * schedule stays paused unless the document explicitly says otherwise.
 */
function normalizeSchedule(
  document: Record<string, unknown>,
  issues: WorkflowProtocolIssue[],
): void {
  const existing = document['schedule']

  // Flat legacy spelling: { cron: "...", isActive: true }
  const flatCron = document['cron'] ?? document['cron_expr'] ?? document['cronExpression']
  if (existing === undefined && typeof flatCron === 'string') {
    const isActive = document['isActive'] ?? document['is_active'] ?? false
    document['schedule'] = { cron: flatCron, isActive: Boolean(isActive) }
    issues.push(
      protocolIssue(
        'structure',
        'schedule',
        'Moved top-level CRON fields into the "schedule" object.',
        'warning',
      ),
    )
  }
  delete document['cron']
  delete document['cron_expr']
  delete document['cronExpression']
  delete document['isActive']
  delete document['is_active']

  const schedule = document['schedule']
  if (!isPlainObject(schedule)) return

  const normalized: Record<string, unknown> = { ...schedule }
  if (normalized['cron'] === undefined && typeof normalized['expression'] === 'string') {
    normalized['cron'] = normalized['expression']
    delete normalized['expression']
  }
  if (normalized['isActive'] === undefined && normalized['is_active'] !== undefined) {
    normalized['isActive'] = Boolean(normalized['is_active'])
    delete normalized['is_active']
  }

  if (normalized['isActive'] === true) {
    issues.push(
      protocolIssue(
        'structure',
        'schedule.isActive',
        'This document asks for an active schedule. Review it before saving — imported schedules start paused unless you confirm.',
        'warning',
      ),
    )
  }

  document['schedule'] = normalized
}

function stripNonPortableKeys(
  target: Record<string, unknown>,
  keys: readonly string[],
  pathPrefix: string,
  issues: WorkflowProtocolIssue[],
): void {
  for (const key of keys) {
    if (!(key in target)) continue
    delete target[key]
    issues.push(
      protocolIssue(
        'structure',
        pathPrefix ? `${pathPrefix}.${key}` : key,
        `Ignored "${key}" — internal and environment-specific fields are not part of the portable workflow.`,
        'warning',
      ),
    )
  }
}
