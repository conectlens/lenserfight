// Supabase Edge Function: vote-eligible-agents
//
// Called by pg_cron every 5 minutes. For each battle currently in the voting
// phase, finds AI agents that are eligible to vote (can_vote=true, quota not
// exhausted, not already voted), calls Claude to generate a vote decision in
// character with the agent's personality, then records the vote and ticks the
// agent's daily quota via agents.fn_agent_action.
//
// Invocation: pg_cron → net.http_post → this function (no request body needed)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL         = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANTHROPIC_API_KEY    = Deno.env.get('ANTHROPIC_API_KEY')!;

// Haiku is sufficient for voting decisions — fast and cheap.
const DEFAULT_VOTE_MODEL = 'claude-haiku-4-5-20251001';

interface ActiveBattle {
  id: string;
  task_prompt: string;
  voter_eligibility: string;
  ai_judge_model_key: string | null;
}

interface Submission {
  contender_id: string;
  content_text: string | null;
  slot: string;
}

interface EligibleAgent {
  ai_lenser_id: string;
  profile_id: string;
  personality_note: string | null;
  votes_used: number;
  max_daily_votes: number;
}

interface AnthropicResponse {
  content: Array<{ type: string; text: string }>;
}

interface VoteDecision {
  vote: 'contender_a' | 'contender_b' | 'draw';
  contender_id: string | null;
  rationale: string;
}

async function callClaude(
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 512,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic error ${res.status}: ${text}`);
  }

  const data = await res.json() as AnthropicResponse;
  return data.content.find((b) => b.type === 'text')?.text ?? '';
}

function buildVoterSystem(agent: EligibleAgent): string {
  const personality = agent.personality_note
    ? `Your personality and style:\n${agent.personality_note}\n\n`
    : '';

  return `${personality}You are voting in an AI battle competition. Two AI contenders have responded to a task prompt. Read both responses carefully and decide which one is better, or if it is a draw.

Respond ONLY with a valid JSON object (no markdown):
{
  "vote": "contender_a" | "contender_b" | "draw",
  "rationale": "one concise sentence explaining your choice"
}

Be opinionated and decisive. Prefer "contender_a" or "contender_b" over "draw" unless the responses are genuinely equal.`;
}

function buildVoterPrompt(battle: ActiveBattle, submissions: Submission[]): string {
  const slotA = submissions.find((s) => s.slot === 'A');
  const slotB = submissions.find((s) => s.slot === 'B');

  return `Task: ${battle.task_prompt}

=== Contender A ===
${slotA?.content_text ?? '[No submission]'}

=== Contender B ===
${slotB?.content_text ?? '[No submission]'}

Which response is better? Return JSON as instructed.`;
}

function parseVoteDecision(raw: string, submissions: Submission[]): VoteDecision | null {
  try {
    const json = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(json) as { vote: string; rationale: string };

    if (!['contender_a', 'contender_b', 'draw'].includes(parsed.vote)) return null;

    const vote = parsed.vote as VoteDecision['vote'];
    let contender_id: string | null = null;

    if (vote === 'contender_a') {
      contender_id = submissions.find((s) => s.slot === 'A')?.contender_id ?? null;
    } else if (vote === 'contender_b') {
      contender_id = submissions.find((s) => s.slot === 'B')?.contender_id ?? null;
    } else {
      // Draw: slot A contender used for the vote_aggregates row
      contender_id = submissions.find((s) => s.slot === 'A')?.contender_id ?? null;
    }

    return { vote, contender_id, rationale: String(parsed.rationale ?? '') };
  } catch {
    return null;
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results  = { battles_processed: 0, votes_cast: 0, errors: 0 };

  try {
    // Battles in voting phase that accept AI voters
    const { data: battles, error: bErr } = await supabase
      .schema('battles')
      .from('battles')
      .select('id, task_prompt, voter_eligibility, ai_judge_model_key')
      .eq('status', 'voting')
      .in('voter_eligibility', ['open', 'ai_only', 'lenser_only'])
      .gt('voting_closes_at', new Date().toISOString());

    if (bErr) throw new Error(`Battles fetch failed: ${bErr.message}`);

    for (const battle of (battles ?? []) as ActiveBattle[]) {
      results.battles_processed++;

      // Fetch submissions (need slot info for the prompt)
      const { data: submData } = await supabase
        .schema('battles')
        .from('submissions')
        .select('contender_id, content_text, contenders(slot)')
        .eq('battle_id', battle.id)
        .eq('status', 'submitted');

      const submissions: Submission[] = (submData ?? []).map((s: Record<string, unknown>) => ({
        contender_id: s['contender_id'] as string,
        content_text: s['content_text'] as string | null,
        slot: (s['contenders'] as Record<string, unknown>)?.['slot'] as string ?? '?',
      }));

      if (submissions.length < 2) continue;

      // AI agents who are active, can vote, and have quota remaining
      const { data: agentData, error: agentErr } = await supabase
        .schema('agents')
        .from('v_agent_profile')
        .select('ai_lenser_id, profile_id, personality_note, votes_used, max_daily_votes')
        .eq('can_vote', true)
        .eq('is_active', true);

      if (agentErr) {
        console.error(`[vote-eligible-agents] agent query failed for battle ${battle.id}:`, agentErr.message);
        results.errors++;
        continue;
      }

      // IDs of agents who already voted on this battle
      const { data: existingVotes } = await supabase
        .schema('battles')
        .from('votes')
        .select('voter_lenser_id')
        .eq('battle_id', battle.id);

      const votedIds = new Set(
        (existingVotes ?? []).map((v: Record<string, unknown>) => v['voter_lenser_id'] as string)
      );

      const eligibleAgents = (agentData ?? [] as EligibleAgent[])
        .filter((a: EligibleAgent) =>
          !votedIds.has(a.profile_id) &&
          (a.votes_used ?? 0) < (a.max_daily_votes ?? 10)
        );

      for (const agent of eligibleAgents as EligibleAgent[]) {
        try {
          // Gate and tick the daily quota atomically
          const { data: actionResult, error: actionErr } = await supabase
            .schema('agents')
            .rpc('fn_agent_action', {
              p_ai_lenser_id: agent.ai_lenser_id,
              p_action_type:  'cast_vote',
              p_context_type: 'battle',
              p_context_id:   battle.id,
            });

          if (actionErr) throw new Error(`fn_agent_action: ${actionErr.message}`);

          const actionData = actionResult as { result: string } | null;
          if (!actionData || actionData.result !== 'success') continue;

          // Generate vote decision with Claude
          const model     = battle.ai_judge_model_key ?? DEFAULT_VOTE_MODEL;
          const rawResp   = await callClaude(model, buildVoterSystem(agent), buildVoterPrompt(battle, submissions));
          const decision  = parseVoteDecision(rawResp, submissions);

          if (!decision || !decision.contender_id) continue;

          // Submit the vote via service-role internal function
          const { error: voteErr } = await supabase
            .schema('battles')
            .rpc('fn_submit_agent_vote', {
              p_battle_id:          battle.id,
              p_voter_lenser_id:    agent.profile_id,
              p_voted_contender_id: decision.contender_id,
              p_vote_value:         decision.vote,
              p_is_draw:            decision.vote === 'draw',
              p_rationale:          decision.rationale,
            });

          if (voteErr) throw new Error(`fn_submit_agent_vote: ${voteErr.message}`);

          results.votes_cast++;
        } catch (err) {
          console.error(
            `[vote-eligible-agents] agent ${agent.ai_lenser_id} on battle ${battle.id}:`,
            err,
          );
          results.errors++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[vote-eligible-agents] fatal:', err);
    return new Response(JSON.stringify({ error: String(err), ...results }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
