/**
 * Canonical LenserFight workflow protocol.
 *
 * This module is the single source of truth for the portable shape of a
 * workflow. Every other layer derives from it:
 *
 *   - AI-facing instructions are generated from it (never hand-written)
 *   - JSON and YAML imports validate against it
 *   - workflow persistence maps from it
 *   - export serialises back to it
 *
 * Types are inferred from the schemas so there is exactly one definition of
 * every field. Do not add a parallel hand-written interface.
 *
 * Deliberately absent: visibility, database identifiers, lenser/tenant ids,
 * timestamps, canvas state, credentials, funding. Those are wizard or
 * persistence metadata, not portable workflow content.
 */
import { z } from 'zod'

/** Current protocol identifier written into every exported document. */
export const WORKFLOW_PROTOCOL_ID = 'lenserfight.workflow/v1' as const

/** Protocol identifiers this build can read. */
export const SUPPORTED_WORKFLOW_PROTOCOL_IDS = [WORKFLOW_PROTOCOL_ID] as const

/**
 * Step categories. These are protocol-level groupings, not node types — the
 * concrete node type is resolved against the runtime node catalog, which lives
 * in the infra layer and is intentionally not a dependency of this module.
 */
export const WORKFLOW_STEP_KINDS = ['trigger', 'lens', 'tool', 'logic'] as const
export type WorkflowStepKind = (typeof WORKFLOW_STEP_KINDS)[number]

/** Kinds that may act as a workflow entry point. */
export const WORKFLOW_ENTRY_KINDS: readonly WorkflowStepKind[] = ['trigger'] as const

export const MIN_WORKFLOW_TITLE_LENGTH = 3
export const MAX_WORKFLOW_TITLE_LENGTH = 120

/** Matches `step-3.someOutput` / `step-3.Some Parameter Label`. */
export const CONNECTION_ENDPOINT_PATTERN = /^step-(\d+)\.(.+)$/

/** Standard 5-field CRON (minute hour day month weekday). */
export const CRON_FIELD_COUNT = 5

// ── Primitive value shapes ──────────────────────────────────────────────────

/**
 * A parameter value as an AI model would write it. Objects and arrays are
 * allowed because schema-builder and key-value fields legitimately need them;
 * they are serialised at the persistence boundary, not here.
 */
export const parameterValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(parameterValueSchema),
    z.record(z.string(), parameterValueSchema),
  ]),
)

// ── Lens definition ─────────────────────────────────────────────────────────

export const lensParameterDefinitionSchema = z
  .object({
    label: z.string().trim().min(1, 'Lens parameter label cannot be empty.'),
    type: z.string().trim().min(1).optional(),
    required: z.boolean().optional(),
    description: z.string().trim().optional(),
    example: parameterValueSchema.optional(),
  })
  .strict()

/**
 * A reusable Lens definition. Distinct from a Lens *node* — the definition is
 * the artifact that gets created or reused; the node is one placement of it in
 * one workflow, carrying its own parameter values.
 */
export const lensDefinitionSchema = z
  .object({
    /**
     * Import-local stable reference. Lens nodes point at a definition through
     * this key rather than through a display title, so two lenses that happen
     * to share a title are never conflated.
     */
    ref: z
      .string()
      .trim()
      .min(1)
      .regex(
        /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
        'Lens ref must start alphanumeric and contain only letters, digits, hyphen, underscore.',
      ),
    title: z.string().trim().min(MIN_WORKFLOW_TITLE_LENGTH, 'Lens title is too short.'),
    description: z.string().trim().optional(),
    /** The prompt body. Uses [[Label]] tokens for parameters, per lens convention. */
    instructions: z.string().trim().optional(),
    parameters: z.array(lensParameterDefinitionSchema).optional(),
    outputs: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

// ── Steps ───────────────────────────────────────────────────────────────────

export const workflowStepSchema = z
  .object({
    /** 1-based, unique within the document. Referenced by connections. */
    step: z.number().int().positive('Step numbers start at 1.'),
    kind: z.enum(WORKFLOW_STEP_KINDS),
    /** Readable palette entry or Lens name. Resolved against the node catalog. */
    name: z.string().trim().min(1, 'Step name cannot be empty.'),
    /**
     * Explicit catalog node type (e.g. `form_input_trigger`). Optional: when
     * omitted the importer resolves `name` against the catalog. Providing it
     * removes all ambiguity and is what export always emits.
     */
    nodeType: z.string().trim().min(1).optional(),
    purpose: z.string().trim().optional(),
    /** For `kind: 'lens'` — which lens definition this node instantiates. */
    lensRef: z.string().trim().min(1).optional(),
    /** Workflow-specific values, keyed by parameter label. */
    parameters: z.record(z.string(), parameterValueSchema).optional(),
    /** Output keys this step publishes for downstream connections. */
    outputs: z.array(z.string().trim().min(1)).optional(),
  })
  .strict()

// ── Connections ─────────────────────────────────────────────────────────────

const connectionEndpointSchema = z
  .string()
  .trim()
  .regex(CONNECTION_ENDPOINT_PATTERN, 'Endpoint must look like "step-2.fieldName".')

export const workflowConnectionSchema = z
  .object({
    /** `step-<n>.<outputKey>` on the producing step. */
    from: connectionEndpointSchema,
    /** `step-<n>.<parameterLabel>` on the consuming step. */
    to: connectionEndpointSchema,
  })
  .strict()

// ── Schedule ────────────────────────────────────────────────────────────────

export const workflowScheduleSchema = z
  .object({
    /** Standard 5-field CRON expression. */
    cron: z
      .string()
      .trim()
      .refine(
        (value) => value.split(/\s+/).filter(Boolean).length === CRON_FIELD_COUNT,
        `CRON expression must have exactly ${CRON_FIELD_COUNT} fields (minute hour day month weekday).`,
      ),
    timezone: z.string().trim().min(1).optional(),
    /**
     * Whether the schedule should run. Defaults to false: an imported document
     * never silently starts firing on the importing user's account.
     */
    isActive: z.boolean().default(false),
  })
  .strict()

// ── Document ────────────────────────────────────────────────────────────────

export const workflowDocumentSchema = z
  .object({
    /**
     * Absent on legacy documents; `normalizeWorkflowDocument` stamps it before
     * validation, so by the time we get here it is always present.
     */
    protocol: z.literal(WORKFLOW_PROTOCOL_ID),
    title: z
      .string()
      .trim()
      .min(MIN_WORKFLOW_TITLE_LENGTH, `Title must be at least ${MIN_WORKFLOW_TITLE_LENGTH} characters.`)
      .max(MAX_WORKFLOW_TITLE_LENGTH, `Title must be at most ${MAX_WORKFLOW_TITLE_LENGTH} characters.`),
    /** Wizard step 1 description. */
    description: z.string().trim().optional(),
    /** One sentence describing the end result. */
    outcome: z.string().trim().optional(),
    /** Wizard step 2 scheduling. */
    schedule: workflowScheduleSchema.optional(),
    /** Reusable lens definitions referenced by `lensRef` on lens steps. */
    lenses: z.array(lensDefinitionSchema).optional(),
    steps: z.array(workflowStepSchema).min(1, 'A workflow needs at least one step.'),
    connections: z.array(workflowConnectionSchema).default([]),
    /** Human-readable list of values the user must supply. */
    userInputs: z.array(z.string().trim().min(1)).optional(),
    /** Human-readable pre-run checks. */
    validation: z.array(z.string().trim().min(1)).optional(),
    finalOutput: z.string().trim().optional(),
  })
  .strict()

// ── Inferred types (the only type definitions — do not duplicate) ───────────

export type WorkflowDocument = z.infer<typeof workflowDocumentSchema>
export type WorkflowStep = z.infer<typeof workflowStepSchema>
export type WorkflowConnection = z.infer<typeof workflowConnectionSchema>
export type WorkflowSchedule = z.infer<typeof workflowScheduleSchema>
export type LensDefinition = z.infer<typeof lensDefinitionSchema>
export type LensParameterDefinition = z.infer<typeof lensParameterDefinitionSchema>

/** The shape callers hand in before defaults are applied. */
export type WorkflowDocumentInput = z.input<typeof workflowDocumentSchema>

// ── Endpoint helpers ────────────────────────────────────────────────────────

export interface ConnectionEndpoint {
  step: number
  field: string
}

/**
 * Splits `step-2.Aspect Ratio` into `{ step: 2, field: 'Aspect Ratio' }`.
 * Returns null when the string is not a valid endpoint.
 */
export function parseConnectionEndpoint(endpoint: string): ConnectionEndpoint | null {
  const match = CONNECTION_ENDPOINT_PATTERN.exec(endpoint.trim())
  if (!match) return null
  const [, rawStep, field] = match
  const step = Number.parseInt(rawStep ?? '', 10)
  if (!Number.isInteger(step) || step < 1) return null
  const trimmedField = (field ?? '').trim()
  if (!trimmedField) return null
  return { step, field: trimmedField }
}

export function formatConnectionEndpoint(step: number, field: string): string {
  return `step-${step}.${field}`
}
