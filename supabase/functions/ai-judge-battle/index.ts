// Supabase Edge Function: ai-judge-battle
//
// Invoked by battles.fn_auto_finalize_battles() via net.http_post when
// ai_judge_enabled = TRUE on the battle. Scores each contender submission
// using Claude and records verdicts via fn_record_ai_judge_verdict(), which
// then triggers finalization automatically.
//
// Expected POST body: { battle_id: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL        = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY   = Deno.env.get('ANTHROPIC_API_KEY')!;

const DEFAULT_MODEL = 'claude-sonnet-4-6';

interface Battle {
  id: string;
  task_prompt: string;
  ai_judge_prompt: string | null;
  ai_judge_model_key: string | null;
}

interface Submission {
  contender_id: string;
  content_text: string | null;
  slot: string;
}

interface RubricCriterion {
  id: string;
  title: string;
  description: string | null;
  weight: number;
}

interface Verdict {
  contender_id: string;
  criterion_id: string | null;
  score: number;
  rationale: string;
  model_key: string;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

async function callClaude(
  model: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':    'application/json',
      'x-api-key':       ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${text}`);
  }

  const data = await res.json() as AnthropicResponse;
  const textBlock = data.content.find((b) => b.type === 'text');
  return textBlock?.text ?? '';
}

function buildSystemPrompt(battle: Battle, criteria: RubricCriterion[]): string {
  const rubricSection = criteria.length > 0
    ? `\n\nScoring rubric:\n${criteria.map((c) =>
        `- ${c.title} (weight ${c.weight}): ${c.description ?? ''}`
      ).join('\n')}`
    : '';

  const customInstructions = battle.ai_judge_prompt
    ? `\n\nAdditional judging instructions:\n${battle.ai_judge_prompt}`
    : '';

  return `You are a neutral AI judge evaluating submissions to a creative battle. Your role is to score each submission fairly and objectively.

Score each submission on a scale of 0–10 for ${criteria.length > 0 ? 'each rubric criterion' : 'overall quality'}.${rubricSection}${customInstructions}

Respond ONLY with a valid JSON array. Each element must have:
- "contender_id": the exact UUID provided
${criteria.length > 0 ? '- "criterion_id": the exact criterion UUID provided\n' : ''}- "score": number between 0 and 10 (decimals allowed)
- "rationale": one concise sentence explaining the score

No markdown, no explanation outside the JSON array.`;
}

function buildUserPrompt(
  battle: Battle,
  submissions: Submission[],
  criteria: RubricCriterion[],
): string {
  const submissionBlocks = submissions
    .map((s, i) => `=== Submission ${i + 1} (Slot ${s.slot}) ===
Contender ID: ${s.contender_id}
Content:
${s.content_text ?? '[No content submitted]'}`)
    .join('\n\n');

  const criteriaBlock = criteria.length > 0
    ? `\nCriteria to score against:\n${criteria.map((c) => `- ID: ${c.id}  Title: ${c.title}`).join('\n')}`
    : '';

  return `Task prompt: ${battle.task_prompt}
${criteriaBlock}

Submissions to evaluate:

${submissionBlocks}

Return a JSON array of verdict objects as specified in your instructions.`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let battle_id: string;
  try {
    const body = await req.json() as { battle_id?: string };
    if (!body.battle_id) throw new Error('Missing battle_id');
    battle_id = body.battle_id;
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    db: { schema: 'battles' },
  });

  try {
    // Fetch battle details
    const { data: battleData, error: battleErr } = await supabase
      .from('battles')
      .select('id, task_prompt, ai_judge_prompt, ai_judge_model_key')
      .eq('id', battle_id)
      .single();

    if (battleErr || !battleData) {
      throw new Error(`Battle not found: ${battleErr?.message}`);
    }

    const battle = battleData as Battle;
    const model = battle.ai_judge_model_key ?? DEFAULT_MODEL;

    // Fetch submissions with contender slot
    const { data: submissionData, error: submErr } = await supabase
      .from('submissions')
      .select('contender_id, content_text, contenders(slot)')
      .eq('battle_id', battle_id)
      .eq('status', 'submitted');

    if (submErr) throw new Error(`Submissions fetch failed: ${submErr.message}`);

    const submissions: Submission[] = (submissionData ?? []).map((s: Record<string, unknown>) => ({
      contender_id: s['contender_id'] as string,
      content_text: s['content_text'] as string | null,
      slot: (s['contenders'] as Record<string, unknown>)?.['slot'] as string ?? '?',
    }));

    if (submissions.length === 0) {
      throw new Error('No submissions found for battle');
    }

    // Fetch rubric criteria (if any)
    const { data: criteriaData } = await supabase
      .from('rubric_criteria')
      .select('id, title, description, weight')
      .eq('battle_id', battle_id);

    const criteria = (criteriaData ?? []) as RubricCriterion[];

    // Build prompts and call Claude
    const systemPrompt = buildSystemPrompt(battle, criteria);
    const userPrompt   = buildUserPrompt(battle, submissions, criteria);

    const rawResponse = await callClaude(model, systemPrompt, userPrompt);

    // Parse JSON response — strip any accidental markdown fences
    const jsonText = rawResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(jsonText) as Array<Record<string, unknown>>;

    const verdicts: Verdict[] = parsed.map((v) => ({
      contender_id: v['contender_id'] as string,
      criterion_id: (v['criterion_id'] as string | null) ?? null,
      score:        Number(v['score']),
      rationale:    String(v['rationale'] ?? ''),
      model_key:    model,
    }));

    // Record verdicts — this triggers fn_battles_finalize internally
    const publicClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: verdictErr } = await publicClient
      .schema('battles')
      .rpc('fn_record_ai_judge_verdict', {
        p_battle_id: battle_id,
        p_verdicts:  JSON.stringify(verdicts),
      });

    if (verdictErr) throw new Error(`fn_record_ai_judge_verdict failed: ${verdictErr.message}`);

    return new Response(
      JSON.stringify({ ok: true, verdicts_recorded: verdicts.length }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[ai-judge-battle]', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
