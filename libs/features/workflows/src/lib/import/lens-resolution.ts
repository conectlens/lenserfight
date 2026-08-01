/**
 * Lens reuse and conflict policy for workflow import.
 *
 * The rule that matters: importing a workflow must never modify a lens the
 * user already owns. Two people can legitimately have different lenses called
 * "Summarize", and an import that overwrote one would destroy work that has
 * nothing to do with this workflow.
 *
 * So the only two outcomes are *reuse an existing lens unchanged* or *create a
 * new one*. There is no update path, and titles alone never establish
 * identity — a candidate must also be parameter-compatible.
 */
import type { LensDefinition } from '@lenserfight/domain/workflow-protocol'
import type { CreateLensDTO, LensRecord } from '@lenserfight/types'

/** Minimum content length enforced by `lensesService.createLens`. */
const MIN_LENS_CONTENT_LENGTH = 50

export type LensResolutionAction = 'reused' | 'created'

export interface LensResolutionEntry {
  ref: string
  lensId: string
  title: string
  action: LensResolutionAction
}

export interface LensResolutionOutcome {
  entries: LensResolutionEntry[]
  /** Ids of lenses this import created, for compensation on failure. */
  createdLensIds: string[]
  warnings: string[]
}

export interface LensResolverDeps {
  /** Candidate lenses the current user already owns. */
  listOwnedLenses: () => Promise<
    { id: string; title: string; parameterLabels?: string[] }[]
  >
  createLens: (input: CreateLensDTO) => Promise<LensRecord>
  /**
   * Tool id used for imported lens parameters. Every version param needs one,
   * and imported parameters are plain text until the author edits the lens.
   */
  textToolId: string | undefined
}

/**
 * True when an existing lens can stand in for a definition.
 *
 * Compatibility is deliberately strict: every parameter the document expects
 * must exist on the candidate. A candidate with *extra* parameters is still
 * acceptable — the workflow simply will not set them — but a missing one would
 * leave a node permanently unsatisfiable.
 */
export function isLensCompatible(
  definition: LensDefinition,
  candidate: { title: string; parameterLabels?: string[] },
): boolean {
  if (normalizeTitle(candidate.title) !== normalizeTitle(definition.title)) return false

  const required = (definition.parameters ?? []).map((parameter) => parameter.label)
  if (required.length === 0) return true

  const available = new Set((candidate.parameterLabels ?? []).map(normalizeTitle))
  return required.every((label) => available.has(normalizeTitle(label)))
}

function normalizeTitle(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Builds the lens body from a definition.
 *
 * `createLens` rejects short content, so a definition that carries no
 * instructions is padded from its description and purpose rather than failing
 * the whole import over a prompt the author left thin.
 */
export function buildLensContent(definition: LensDefinition): string {
  const parts: string[] = []
  if (definition.instructions) parts.push(definition.instructions)
  if (parts.length === 0 && definition.description) parts.push(definition.description)

  const parameterHints = (definition.parameters ?? [])
    .map((parameter) => `[[${parameter.label}]]`)
    .join(' ')

  let content = parts.join('\n\n').trim()
  if (parameterHints && !content.includes('[[')) {
    content = `${content}\n\n${parameterHints}`.trim()
  }

  if (content.length < MIN_LENS_CONTENT_LENGTH) {
    content =
      `${content}\n\n` +
      `Imported from a workflow document. Refine these instructions in the lens editor.`
  }

  return content.trim()
}

/**
 * Resolves every lens definition to a concrete lens id, creating what is
 * missing. Callers must pass `createdLensIds` to the compensation path if a
 * later stage of the import fails.
 */
export async function resolveLensDefinitions(
  definitions: readonly LensDefinition[],
  deps: LensResolverDeps,
): Promise<LensResolutionOutcome> {
  const entries: LensResolutionEntry[] = []
  const createdLensIds: string[] = []
  const warnings: string[] = []

  if (definitions.length === 0) {
    return { entries, createdLensIds, warnings }
  }

  const owned = await deps.listOwnedLenses()

  if (!deps.textToolId && definitions.some((definition) => definition.parameters?.length)) {
    warnings.push(
      'The text parameter tool could not be loaded, so imported lenses were created without parameters. Add them in the lens editor.',
    )
  }

  for (const definition of definitions) {
    const match = owned.find((candidate) => isLensCompatible(definition, candidate))

    if (match) {
      entries.push({
        ref: definition.ref,
        lensId: match.id,
        title: match.title,
        action: 'reused',
      })
      continue
    }

    const sameTitle = owned.find(
      (candidate) => normalizeTitle(candidate.title) === normalizeTitle(definition.title),
    )
    if (sameTitle) {
      warnings.push(
        `You already own a lens called "${sameTitle.title}", but its parameters do not match this workflow. ` +
          `A separate lens was created instead — your existing one was not modified.`,
      )
    }

    // Imported lenses start private. The workflow's own visibility is chosen
    // by the user in the wizard; silently publishing a lens on their behalf
    // because a document said so would be a privacy decision we do not own.
    const created = await deps.createLens({
      title: definition.title,
      description: definition.description ?? null,
      content: buildLensContent(definition),
      tagIds: [],
      visibility: 'private',
      ...(deps.textToolId
        ? {
            params: (definition.parameters ?? []).map((parameter) => ({
              label: parameter.label,
              toolId: deps.textToolId as string,
            })),
          }
        : {}),
    })

    createdLensIds.push(created.id)
    entries.push({
      ref: definition.ref,
      lensId: created.id,
      title: created.title,
      action: 'created',
    })
  }

  return { entries, createdLensIds, warnings }
}
