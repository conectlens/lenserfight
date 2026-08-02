/**
 * Generates the AI-facing workflow authoring instructions.
 *
 * The instructions are *derived*, never hand-written. A hand-maintained prompt
 * drifts from the validator the moment a node is added or a field is renamed,
 * and the failure mode is silent: the model keeps producing documents the
 * importer has quietly stopped accepting. Generating from the same catalog and
 * the same protocol the importer uses makes that class of bug impossible.
 *
 * Token cost is deliberate. The node list is emitted as one line per node
 * because the model must not invent node types, and a truncated list is the
 * single most likely cause of an unusable response. This text is copied by a
 * human into a chat window once — it is not sent on every request — so the
 * size trade is worth the accuracy.
 */
import {
  WORKFLOW_NODE_CATEGORIES,
  getWorkflowNodeCategoryLabel,
  getWorkflowNodesByCategory,
  type WorkflowNodeCatalogEntry,
  type WorkflowNodeCategory,
} from '@lenserfight/infra/execution'
import {
  CRON_FIELD_COUNT,
  MAX_WORKFLOW_TITLE_LENGTH,
  MIN_WORKFLOW_TITLE_LENGTH,
  WORKFLOW_PROTOCOL_ID,
} from '@lenserfight/domain/workflow-protocol'

export type WorkflowInstructionFormat = 'json' | 'yaml'

export interface WorkflowInstructionOptions {
  /** Which serialisation the model should return. Defaults to JSON. */
  format?: WorkflowInstructionFormat
  /**
   * Include a one-line description per node. Defaults to true — without it
   * models pick plausible-sounding but wrong nodes.
   */
  includeNodeDescriptions?: boolean
}

/** Categories that can legally start a workflow. */
const ENTRY_CATEGORY: WorkflowNodeCategory = 'trigger'

function nodeLine(entry: WorkflowNodeCatalogEntry, withDescription: boolean): string {
  const outputs = entry.outputs.map((output) => output.name).join(', ') || 'none'
  const base = `- \`${entry.type}\` — ${entry.displayName} · outputs: ${outputs}`
  if (!withDescription) return base
  return `${base}\n  ${entry.description}`
}

function renderCatalog(withDescriptions: boolean): string {
  const sections: string[] = []

  for (const category of WORKFLOW_NODE_CATEGORIES) {
    const entries = getWorkflowNodesByCategory(category)
    if (entries.length === 0) continue

    const label = getWorkflowNodeCategoryLabel(category)
    const kindHint =
      category === ENTRY_CATEGORY
        ? ' — use these as `kind: trigger`'
        : category === 'lens'
          ? ' — use this as `kind: lens`'
          : category === 'logic'
            ? ' — use these as `kind: logic`'
            : ' — use these as `kind: tool`'

    sections.push(`### ${label}${kindHint}`)
    sections.push(entries.map((entry) => nodeLine(entry, withDescriptions)).join('\n'))
    sections.push('')
  }

  return sections.join('\n').trimEnd()
}

const JSON_TEMPLATE = `{
  "protocol": "${WORKFLOW_PROTOCOL_ID}",
  "title": "Short workflow title",
  "description": "What this workflow is for.",
  "outcome": "One sentence describing the final result.",
  "schedule": {
    "cron": "0 9 * * 1",
    "isActive": false
  },
  "lenses": [
    {
      "ref": "topic-to-image",
      "title": "Topic to Image Prompt",
      "description": "Turns a topic into a single strong visual composition.",
      "instructions": "Write one cinematic scene for [[Topic]] in [[Visual Style]].",
      "parameters": [
        { "label": "Topic", "type": "text", "required": true },
        { "label": "Visual Style", "type": "text", "required": false }
      ],
      "outputs": ["image", "imagePrompt"]
    }
  ],
  "steps": [
    {
      "step": 1,
      "kind": "trigger",
      "nodeType": "form_input_trigger",
      "name": "Form Input Trigger",
      "purpose": "Collect the topic from the user.",
      "parameters": { "title": "Video brief" },
      "outputs": ["formData"]
    },
    {
      "step": 2,
      "kind": "lens",
      "name": "Topic to Image Prompt",
      "lensRef": "topic-to-image",
      "purpose": "Turn the topic into an image.",
      "parameters": { "Visual Style": "Cinematic and photorealistic" },
      "outputs": ["image", "imagePrompt"]
    }
  ],
  "connections": [
    { "from": "step-1.formData", "to": "step-2.Topic" }
  ],
  "userInputs": ["Topic"],
  "validation": ["Topic must not be empty."],
  "finalOutput": "A generated image plus the prompt used."
}`

const YAML_TEMPLATE = `protocol: "${WORKFLOW_PROTOCOL_ID}"
title: Short workflow title
description: What this workflow is for.
outcome: One sentence describing the final result.
schedule:
  cron: "0 9 * * 1"
  isActive: false
lenses:
  - ref: topic-to-image
    title: Topic to Image Prompt
    description: Turns a topic into a single strong visual composition.
    instructions: Write one cinematic scene for [[Topic]] in [[Visual Style]].
    parameters:
      - label: Topic
        type: text
        required: true
      - label: Visual Style
        type: text
        required: false
    outputs: [image, imagePrompt]
steps:
  - step: 1
    kind: trigger
    nodeType: form_input_trigger
    name: Form Input Trigger
    purpose: Collect the topic from the user.
    parameters:
      title: Video brief
    outputs: [formData]
  - step: 2
    kind: lens
    name: Topic to Image Prompt
    lensRef: topic-to-image
    purpose: Turn the topic into an image.
    parameters:
      Visual Style: Cinematic and photorealistic
    outputs: [image, imagePrompt]
connections:
  - from: step-1.formData
    to: step-2.Topic
userInputs: [Topic]
validation:
  - Topic must not be empty.
finalOutput: A generated image plus the prompt used.`

/**
 * Builds the full instruction text.
 *
 * Everything variable — node types, protocol id, limits — comes from the same
 * modules the importer validates against.
 */
export function buildWorkflowInstructions(options: WorkflowInstructionOptions = {}): string {
  const format = options.format ?? 'json'
  const withDescriptions = options.includeNodeDescriptions ?? true
  const formatLabel = format.toUpperCase()
  const template = format === 'yaml' ? YAML_TEMPLATE : JSON_TEMPLATE

  return `# Design a LenserFight Workflow

Return exactly one ${formatLabel} workflow document. Nothing else.

## Hard requirements

- Output **only** the ${formatLabel} document. No prose before it, no prose after it.
- Do **not** wrap the document in markdown code fences.
- Return **one** workflow. Do not offer alternatives.
- Use only \`nodeType\` values from the palette listed below. Never invent one.
- Never include: database identifiers, user or tenant identifiers, timestamps,
  credentials, API keys, provider tokens, authentication data, secrets, funding
  information, or a \`visibility\` field.
- If you are unsure a node exists, pick the closest node that *is* listed rather
  than inventing a name or adding a note.

## Document shape

- \`protocol\` (required) — always \`"${WORKFLOW_PROTOCOL_ID}"\`.
- \`title\` (required) — ${MIN_WORKFLOW_TITLE_LENGTH}–${MAX_WORKFLOW_TITLE_LENGTH} characters.
- \`description\` (optional) — what the workflow is for.
- \`outcome\` (optional) — one sentence describing the end result.
- \`schedule\` (optional) — \`cron\` must be a standard ${CRON_FIELD_COUNT}-field expression
  (minute hour day month weekday). \`isActive\` defaults to \`false\`; leave it false
  unless the user explicitly asked for the workflow to start running immediately.
- \`lenses\` (optional) — reusable Lens definitions. See below.
- \`steps\` (required) — at least one. See below.
- \`connections\` (required, may be empty) — see below.
- \`userInputs\`, \`validation\`, \`finalOutput\` (optional) — human-readable notes.

## Steps

Every step needs \`step\` (unique, starting at 1, in dependency order), \`kind\`,
and \`name\`. Always include \`nodeType\` when you know it — it removes all
ambiguity. \`parameters\` holds values for that one step; \`outputs\` lists the keys
the step publishes.

The four kinds:

- \`trigger\` — starts the workflow. Exactly one step should be the entry point,
  and it must be a trigger node.
- \`lens\` — AI reasoning, generation, analysis, or transformation driven by a
  prompt. Set \`lensRef\` to bind it to an entry in \`lenses\`.
- \`logic\` — branching, looping, merging, and flow control.
- \`tool\` — deterministic work: data shaping, storage, HTTP, notifications,
  media processing, integrations.

## Lens definitions vs Lens steps

A Lens *definition* is reusable and lives in \`lenses\`. A Lens *step* is one
placement of that definition inside this workflow.

- Give each definition a \`ref\` (lowercase, hyphenated) and reference it from the
  step with \`lensRef\`. Never identify a lens by its title alone.
- Put the prompt, parameter list, and declared outputs on the *definition*.
- Put the values used by this particular workflow on the *step*.

## Connections

\`connections\` wire one step's output into another step's input:

    { "from": "step-1.formData", "to": "step-2.Topic" }

- \`from\` is \`step-<n>.<outputKey>\` — the key must appear in that step's
  \`outputs\` or in the node's catalog outputs listed below.
- \`to\` is \`step-<n>.<parameterLabel>\` — the label the receiving step expects.
- Connections must run forward: the source step number must be lower than the
  target step number.
- If a value comes from an earlier step, connect it. Do not also hardcode it in
  \`parameters\` — the connection wins and the literal is ignored.
- Values the user supplies go in \`parameters\` as literals, and should be listed
  in \`userInputs\`.

## Available palette

${renderCatalog(withDescriptions)}

## Template

${template}

Return only the ${formatLabel} document.`
}
