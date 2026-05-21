import type { LensCreationContext, WorkflowCreationContext } from './creation.types'

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum input tokens we ever send to the provider.
 * Ensures we stay well within all model context windows and control cost.
 */
export const MAX_CONTEXT_TOKENS = 3000

/**
 * Maximum characters of the user prompt we'll forward to the provider.
 * Enforced client-side in the hook AND server-side in the edge function.
 */
export const MAX_PROMPT_LENGTH = 2000

// ─── Lens prompts ─────────────────────────────────────────────────────────────

const LENS_SYSTEM = `You are an expert LenserFight lens author.
A lens is a reusable AI instruction template written in markdown.
Lenses use [[variable_name]] double-bracket syntax to declare dynamic parameters that users fill in at runtime.

Respond ONLY with a JSON object — no prose, no markdown fences, no explanation:
{
  "title": "Short, descriptive lens title (max 80 chars)",
  "content": "Full lens markdown body with [[variable]] params where appropriate (min 100 chars)",
  "description": "One-sentence description of what this lens does (max 200 chars)",
  "suggestedTagSlugs": ["tag-slug-1", "tag-slug-2"],
  "params": [{"label": "variable_name"}]
}

Rules:
- params must contain every [[variable_name]] used in content, in order of appearance
- title must not duplicate the word 'Lens'
- content should be professional, production-quality prompt engineering
- suggestedTagSlugs should be 1-3 lowercase hyphen-separated topic slugs`

export function buildLensPromptedMessages(
  prompt: string,
  ctx: LensCreationContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  const personaLine = ctx.userPersona
    ? `\nUser AI persona: ${ctx.userPersona.slice(0, 200)}`
    : ''
  const tagsLine =
    ctx.userTagSlugs?.length
      ? `\nUser's usual tags: ${ctx.userTagSlugs.slice(0, 10).join(', ')}`
      : ''

  return [
    { role: 'system', content: LENS_SYSTEM },
    {
      role: 'user',
      content: `Create a lens for:\n${prompt.slice(0, MAX_PROMPT_LENGTH)}${personaLine}${tagsLine}`,
    },
  ]
}

export function buildLensRecommendationMessages(
  ctx: LensCreationContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  const personaLine = ctx.userPersona
    ? `User AI persona: ${ctx.userPersona.slice(0, 200)}\n`
    : ''
  const tagsLine =
    ctx.userTagSlugs?.length
      ? `User's usual tag interests: ${ctx.userTagSlugs.slice(0, 10).join(', ')}\n`
      : ''

  return [
    { role: 'system', content: LENS_SYSTEM },
    {
      role: 'user',
      content: `Suggest a useful, practical lens that would help this user.
${personaLine}${tagsLine}Make it immediately usable — choose a domain you have strong priors about based on the context above, or default to a high-value general-purpose productivity or writing lens if no context is available.`,
    },
  ]
}

// ─── Workflow prompts ─────────────────────────────────────────────────────────

const WORKFLOW_SYSTEM = `You are an expert LenserFight workflow designer.
A workflow connects one or more lenses in sequence to automate multi-step AI tasks.

The user has these lenses available (by ID). You MUST only reference IDs from this list in suggestedLensIds.

Respond ONLY with a JSON object — no prose, no markdown fences, no explanation:
{
  "title": "Concise workflow title (max 80 chars)",
  "description": "One-sentence description of what the workflow automates (max 200 chars)",
  "suggestedLensIds": ["lens-uuid-1", "lens-uuid-2"]
}

Rules:
- suggestedLensIds must be a subset of the available IDs provided — never invent IDs
- Order matters: list lenses in the execution order that makes sense for the workflow
- If none of the available lenses are relevant, return suggestedLensIds: []`

export function buildWorkflowPromptedMessages(
  prompt: string,
  ctx: WorkflowCreationContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  const lensLine =
    ctx.availableLensIds?.length
      ? `\nAvailable lens IDs: ${ctx.availableLensIds.slice(0, 20).join(', ')}`
      : '\nAvailable lens IDs: (none yet)'
  const personaLine = ctx.userPersona
    ? `\nUser AI persona: ${ctx.userPersona.slice(0, 200)}`
    : ''

  return [
    { role: 'system', content: WORKFLOW_SYSTEM },
    {
      role: 'user',
      content: `Create a workflow for:\n${prompt.slice(0, MAX_PROMPT_LENGTH)}${lensLine}${personaLine}`,
    },
  ]
}

export function buildWorkflowRecommendationMessages(
  ctx: WorkflowCreationContext,
): Array<{ role: 'system' | 'user'; content: string }> {
  const lensLine =
    ctx.availableLensIds?.length
      ? `Available lens IDs: ${ctx.availableLensIds.slice(0, 20).join(', ')}\n`
      : 'Available lens IDs: (none yet)\n'
  const personaLine = ctx.userPersona
    ? `User AI persona: ${ctx.userPersona.slice(0, 200)}\n`
    : ''
  const tagsLine =
    ctx.userTagSlugs?.length
      ? `User's usual tag interests: ${ctx.userTagSlugs.slice(0, 10).join(', ')}\n`
      : ''

  return [
    { role: 'system', content: WORKFLOW_SYSTEM },
    {
      role: 'user',
      content: `Suggest a practical workflow that connects these lenses in a useful way.
${lensLine}${personaLine}${tagsLine}Choose the lens combination that forms the most coherent and valuable automation pipeline based on the context above.`,
    },
  ]
}
