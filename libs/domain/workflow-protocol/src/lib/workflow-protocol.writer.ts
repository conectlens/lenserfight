/**
 * The writing half of the protocol: `WorkflowDocument` -> text.
 *
 * Output is deterministic — same document in, byte-identical text out — so
 * exports can be diffed, checksummed, and committed to git. Key order is the
 * declaration order from the schema rather than alphabetical, because these
 * documents are read by humans and by models that benefit from title-first
 * context.
 *
 * Empty optionals are omitted: re-reading the result reapplies the same
 * defaults, so omission is round-trip safe and keeps exports readable.
 */
import {
  getWorkflowDocumentAdapter,
  type WorkflowDocumentFormat,
} from './workflow-protocol.adapters'
import type {
  LensDefinition,
  WorkflowDocument,
  WorkflowStep,
} from './workflow-protocol.schema'

/**
 * Projects a document onto a plain object with stable key ordering.
 * Exported for tests and for callers that want the shape without the text.
 */
export function toCanonicalWorkflowObject(document: WorkflowDocument): Record<string, unknown> {
  const out: Record<string, unknown> = {
    protocol: document.protocol,
    title: document.title,
  }

  if (document.description) out['description'] = document.description
  if (document.outcome) out['outcome'] = document.outcome

  if (document.schedule) {
    const schedule: Record<string, unknown> = {
      cron: document.schedule.cron,
      isActive: document.schedule.isActive,
    }
    if (document.schedule.timezone) schedule['timezone'] = document.schedule.timezone
    out['schedule'] = schedule
  }

  if (document.lenses?.length) {
    out['lenses'] = document.lenses.map(toCanonicalLens)
  }

  out['steps'] = document.steps.map(toCanonicalStep)

  if (document.connections.length) {
    out['connections'] = document.connections.map((connection) => ({
      from: connection.from,
      to: connection.to,
    }))
  }

  if (document.userInputs?.length) out['userInputs'] = [...document.userInputs]
  if (document.validation?.length) out['validation'] = [...document.validation]
  if (document.finalOutput) out['finalOutput'] = document.finalOutput

  return out
}

function toCanonicalLens(lens: LensDefinition): Record<string, unknown> {
  const out: Record<string, unknown> = {
    ref: lens.ref,
    title: lens.title,
  }
  if (lens.description) out['description'] = lens.description
  if (lens.instructions) out['instructions'] = lens.instructions
  if (lens.parameters?.length) {
    out['parameters'] = lens.parameters.map((parameter) => {
      const entry: Record<string, unknown> = { label: parameter.label }
      if (parameter.type) entry['type'] = parameter.type
      if (parameter.required !== undefined) entry['required'] = parameter.required
      if (parameter.description) entry['description'] = parameter.description
      if (parameter.example !== undefined) entry['example'] = parameter.example
      return entry
    })
  }
  if (lens.outputs?.length) out['outputs'] = [...lens.outputs]
  return out
}

function toCanonicalStep(step: WorkflowStep): Record<string, unknown> {
  const out: Record<string, unknown> = {
    step: step.step,
    kind: step.kind,
    name: step.name,
  }
  // Export always pins the resolved node type so a re-import never has to
  // guess from the display name again.
  if (step.nodeType) out['nodeType'] = step.nodeType
  if (step.purpose) out['purpose'] = step.purpose
  if (step.lensRef) out['lensRef'] = step.lensRef
  if (step.parameters && Object.keys(step.parameters).length) {
    out['parameters'] = { ...step.parameters }
  }
  if (step.outputs?.length) out['outputs'] = [...step.outputs]
  return out
}

export function writeWorkflowDocument(
  document: WorkflowDocument,
  format: WorkflowDocumentFormat,
): string {
  return getWorkflowDocumentAdapter(format).stringify(toCanonicalWorkflowObject(document))
}
