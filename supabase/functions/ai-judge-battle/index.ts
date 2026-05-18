// Supabase Edge Function: ai-judge-battle
//
// Purpose: Use Claude to judge a battle by scoring both submissions against rubric criteria.
// Invoked via pg_net from fn_auto_finalize_battles when ai_judge_enabled=TRUE and battle
// enters scoring status. Calls fn_record_ai_judge_verdict to persist scores and trigger finalization.
// Requires ANTHROPIC_API_KEY in Supabase Secrets.

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const MODEL = 'claude-sonnet-4-6'

interface RequestPayload {
  battle_id: string
}

interface ContenderRow {
  id: string
  slot: 'A' | 'B'
  display_name: string
}

interface SubmissionRow {
  contender_id: string
  content_text: string | null
}

interface CriterionRow {
  id: string
  title: string
  description: string | null
  weight: number
}

interface BattleRow {
  id: string
  title: string
  task_prompt: string
  ai_judge_model_key: string | null
  ai_judge_prompt: string | null
}

interface JudgeVerdict {
  contender_id: string
  criterion_id: string | null
  score: number
  rationale: string
  model_key: string
}

function buildSystemPrompt(customPrompt: string | null): string {
  const base = `You are an impartial AI judge evaluating battle submissions.
Score each submission fairly based on the provided criteria.
Return your verdict as a JSON object with the structure shown below.
Be objective, concise, and use the full scoring range (0–10).`
  return customPrompt ? `${customPrompt}\n\n${base}` : base
}

function buildUserPrompt(
  battle: BattleRow,
  contenders: ContenderRow[],
  submissions: SubmissionRow[],
  criteria: CriterionRow[]
): string {
  const subMap = new Map(submissions.map((s) => [s.contender_id, s.content_text ?? '(no submission)']))

  const subA = contenders.find((c) => c.slot === 'A')
  const subB = contenders.find((c) => c.slot === 'B')

  const criteriaBlock =
    criteria.length > 0
      ? criteria
          .map((c) => `- ${c.title} (weight ${c.weight}): ${c.description ?? 'No description'}`)
          .join('\n')
      : '- Overall quality (weight 1): Evaluate overall quality, relevance, and completeness.'

  const criteriaIds = criteria.length > 0 ? criteria.map((c) => c.id) : [null]

  return `# Battle Task
${battle.task_prompt}

# Contender A: ${subA?.display_name ?? 'A'}
${subA ? subMap.get(subA.id) ?? '(no submission)' : '(missing)'}

# Contender B: ${subB?.display_name ?? 'B'}
${subB ? subMap.get(subB.id) ?? '(no submission)' : '(missing)'}

# Scoring Criteria
${criteriaBlock}

# Instructions
Score each contender on each criterion from 0 to 10.
Return ONLY valid JSON in this exact format:

{
  "verdicts": [
    ${
      contenders
        .flatMap((c) =>
          criteriaIds.map((cid) =>
            JSON.stringify({
              contender_id: c.id,
              criterion_id: cid,
              score: 7.5,
              rationale: 'Example rationale',
              model_key: MODEL,
            })
          )
        )
        .join(',\n    ')
    }
  ]
}`
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: RequestPayload
  try {
    payload = await req.json() as RequestPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { battle_id } = payload
  if (!battle_id) return new Response('Missing battle_id', { status: 400 })

  if (!ANTHROPIC_API_KEY) {
    console.warn('ANTHROPIC_API_KEY not set — skipping AI judge')
    return new Response(JSON.stringify({ skipped: true, reason: 'no_api_key' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Supabase credentials not configured', { status: 500 })
  }

  // Fetch battle data via public SECURITY DEFINER RPCs.
  //
  // The battles schema is NOT exposed via PostgREST (migration 20270801000001
  // locked it down). Direct table queries like /rest/v1/battles?schema=battles
  // silently return empty arrays. All data access must go through public RPCs.
  const rpcHeaders = {
    'apikey': SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  const rpc = (name: string, body: Record<string, unknown>) =>
    fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: rpcHeaders,
      body: JSON.stringify(body),
    })

  const [battleRes, contendersRes, submissionsRes, criteriaRes] = await Promise.all([
    rpc('fn_worker_get_battle_for_judge', { p_battle_id: battle_id }),
    rpc('fn_get_battle_contenders', { p_battle_id: battle_id }),
    rpc('fn_get_battle_submissions', { p_battle_id: battle_id }),
    rpc('fn_get_battle_rubric_criteria', { p_battle_id: battle_id }),
  ])

  const [battles, contenders, submissionsRaw, criteria] = await Promise.all([
    battleRes.json() as Promise<BattleRow[]>,
    contendersRes.json() as Promise<ContenderRow[]>,
    submissionsRes.json() as Promise<Array<{ contender_id: string; content_text: string | null }>>,
    criteriaRes.ok ? criteriaRes.json() as Promise<CriterionRow[]> : Promise.resolve([]),
  ])

  // fn_get_battle_submissions returns id + execution columns; pick only what the judge needs.
  const submissions: SubmissionRow[] = (submissionsRaw ?? []).map((s) => ({
    contender_id: s.contender_id,
    content_text: s.content_text,
  }))

  const battle = battles[0]
  if (!battle) {
    return new Response(`Battle ${battle_id} not found`, { status: 404 })
  }

  const judgeModel = battle.ai_judge_model_key ?? MODEL
  const systemPrompt = buildSystemPrompt(battle.ai_judge_prompt)
  const userPrompt = buildUserPrompt(battle, contenders, submissions, criteria as CriterionRow[])

  // Call Anthropic Messages API
  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: judgeModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text()
    console.error('Anthropic API error:', errText)
    return new Response(JSON.stringify({ error: 'anthropic_error', message: errText }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const anthropicData = await anthropicRes.json() as {
    content: Array<{ type: string; text: string }>
  }

  const responseText = anthropicData.content.find((c) => c.type === 'text')?.text ?? ''

  // Parse JSON from response
  let verdicts: JudgeVerdict[]
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found in response')
    const parsed = JSON.parse(jsonMatch[0]) as { verdicts: JudgeVerdict[] }
    verdicts = parsed.verdicts.map((v) => ({ ...v, model_key: judgeModel }))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('Failed to parse AI judge response:', msg, responseText)
    return new Response(JSON.stringify({ error: 'parse_failed', message: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Persist verdicts via RPC
  const persistRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/fn_record_ai_judge_verdict`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ p_battle_id: battle_id, p_verdicts: verdicts }),
  })

  if (!persistRes.ok) {
    const errText = await persistRes.text()
    console.error('fn_record_ai_judge_verdict error:', errText)
    return new Response(JSON.stringify({ error: 'persist_failed', message: errText }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ verdicts_recorded: verdicts.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
