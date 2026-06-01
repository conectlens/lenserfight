import type {
  AICreationOutput,
  GeneratedBattleResult,
  GeneratedLensParamsResult,
  GeneratedLensResult,
  GeneratedWorkflowResult,
  GenerationType,
} from './creation.types'

// ─── JSON extraction ──────────────────────────────────────────────────────────

function extractJson(raw: string): unknown {
  // First try plain parse
  try {
    return JSON.parse(raw.trim())
  } catch {
    // Fall back: extract first {...} block (handles markdown fences or leading prose)
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        // ignore — will throw PARSE_ERROR below
      }
    }
    throw new Error('no JSON object found in response')
  }
}

// ─── Lens output parser ───────────────────────────────────────────────────────

function parseLensOutput(raw: string): GeneratedLensResult {
  const obj = extractJson(raw) as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const content = typeof obj.content === 'string' ? obj.content.trim() : ''
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''

  if (!title) throw new Error('missing title in lens response')
  if (content.length < 10) throw new Error('content too short in lens response')

  const suggestedTagSlugs = Array.isArray(obj.suggestedTagSlugs)
    ? (obj.suggestedTagSlugs as unknown[])
        .filter((t): t is string => typeof t === 'string')
        .map((t) => t.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))
        .slice(0, 10)
    : []

  // Extract params from [[variable]] syntax in content AND from the params array
  const fromContent = [...content.matchAll(/\[\[(\w+)\]\]/g)].map((m) => m[1])
  const fromArray = Array.isArray(obj.params)
    ? (obj.params as unknown[])
        .filter((p): p is { label: string } => typeof (p as { label?: unknown }).label === 'string')
        .map((p) => p.label)
    : []
  const seen = new Set<string>()
  const params: Array<{ label: string }> = []
  for (const label of [...fromContent, ...fromArray]) {
    if (!seen.has(label)) {
      seen.add(label)
      params.push({ label })
    }
  }

  return { title, content, description, suggestedTagSlugs, params }
}

// ─── Workflow output parser ───────────────────────────────────────────────────

function parseWorkflowOutput(raw: string): GeneratedWorkflowResult {
  const obj = extractJson(raw) as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const description = typeof obj.description === 'string' ? obj.description.slice(0, 300).trim() : ''

  if (!title) throw new Error('missing title in workflow response')

  const suggestedLensIds = Array.isArray(obj.suggestedLensIds)
    ? (obj.suggestedLensIds as unknown[])
        .filter((id): id is string => typeof id === 'string')
        .slice(0, 20)
    : []

  return { title, description, suggestedLensIds }
}

// ─── Battle output parser ─────────────────────────────────────────────────────

// Local allow-lists mirror @lenserfight/domain/battle-governance
// (TASK_SOURCES / CONTENDER_STRUCTURES / JUDGING_MODES). Kept inline so this
// generic infra lib does not depend on the battle domain. A hallucinated value
// is dropped to undefined rather than propagated.
const BATTLE_TASK_SOURCES = new Set(['lens', 'workflow', 'challenge'])
const BATTLE_CONTENDER_STRUCTURES = new Set(['ai_vs_ai', 'human_vs_human', 'human_vs_ai'])
const BATTLE_JUDGING_MODES = new Set(['community_vote', 'ai_judge', 'rubric_score', 'auto_score'])

function pickFromSet<T extends string>(value: unknown, allowed: Set<string>): T | undefined {
  return typeof value === 'string' && allowed.has(value) ? (value as T) : undefined
}

function parseBattleOutput(raw: string): GeneratedBattleResult {
  const obj = extractJson(raw) as Record<string, unknown>

  const title = typeof obj.title === 'string' ? obj.title.slice(0, 120).trim() : ''
  const task_prompt = typeof obj.task_prompt === 'string' ? obj.task_prompt.trim() : ''

  if (!title) throw new Error('missing title in battle response')
  if (task_prompt.length < 10) throw new Error('task_prompt too short in battle response')

  const suggestedTaskSource = pickFromSet<GeneratedBattleResult['suggestedTaskSource'] & string>(
    obj.suggestedTaskSource,
    BATTLE_TASK_SOURCES,
  )
  const suggestedContenderStructure = pickFromSet<
    GeneratedBattleResult['suggestedContenderStructure'] & string
  >(obj.suggestedContenderStructure, BATTLE_CONTENDER_STRUCTURES)
  const suggestedJudgingMode = pickFromSet<GeneratedBattleResult['suggestedJudgingMode'] & string>(
    obj.suggestedJudgingMode,
    BATTLE_JUDGING_MODES,
  )
  const suggestedChallengeType =
    suggestedTaskSource === 'challenge' && typeof obj.suggestedChallengeType === 'string'
      ? obj.suggestedChallengeType
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .slice(0, 40) || null
      : null

  return {
    title,
    task_prompt,
    suggestedTaskSource,
    suggestedContenderStructure,
    suggestedJudgingMode,
    suggestedChallengeType,
  }
}

// ─── Lens params output parser ────────────────────────────────────────────────

function parseLensParamsOutput(raw: string): GeneratedLensParamsResult {
  const obj = extractJson(raw) as Record<string, unknown>
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    throw new Error('lens_params response must be a plain JSON object')
  }
  return obj
}

// ─── Unified parser ───────────────────────────────────────────────────────────

export function parseCreationOutput(raw: string, type: GenerationType): AICreationOutput {
  if (type === 'lens') {
    return { type: 'lens', result: parseLensOutput(raw) }
  }
  if (type === 'battle') {
    return { type: 'battle', result: parseBattleOutput(raw) }
  }
  if (type === 'lens_params') {
    return { type: 'lens_params', result: parseLensParamsOutput(raw) }
  }
  return { type: 'workflow', result: parseWorkflowOutput(raw) }
}
