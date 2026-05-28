import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate } from '../utils/output';

async function fetchBattle(id: string): Promise<Record<string, unknown> | null> {
  const battle = await callRpc<Record<string, unknown>>(
    'fn_battles_get_public',
    { p_battle_id: id }
  );
  return battle ?? null;
}

// ---------------------------------------------------------------------------
// inspect contenders
// ---------------------------------------------------------------------------
const contenders = defineCommand({
  meta: {
    name: 'contenders',
    description: 'List contenders for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await fetchBattle(args.id);
      if (!battle) { consola.warn('Battle not found or not public.'); return; }

      const list = battle.contenders as Array<Record<string, unknown>> | undefined;
      if (!list?.length) { consola.info('No contenders.'); return; }

      if (args.json) { printJson(list); return; }

      printTable(
        ['Slot', 'Type', 'Name', 'ID'],
        list.map((c) => [
          String(c.slot || '-'),
          String(c.contender_type || '-'),
          String(c.display_name || '-'),
          String(c.id || '-').substring(0, 8),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect submissions
// ---------------------------------------------------------------------------
const submissions = defineCommand({
  meta: {
    name: 'submissions',
    description: 'Show all submissions for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await fetchBattle(args.id);
      if (!battle) { consola.warn('Battle not found or not public.'); return; }

      const list = battle.submissions as Array<Record<string, unknown>> | undefined;
      if (!list?.length) { consola.info('No submissions.'); return; }

      if (args.json) { printJson(list); return; }

      for (const s of list) {
        consola.info(
          '  [%s] %s — %s',
          String(s.status || '-'),
          String(s.contender_id || '-').substring(0, 8),
          s.content_text
            ? String(s.content_text).substring(0, 80) + '...'
            : '(no text)'
        );
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect votes
// ---------------------------------------------------------------------------
const votes = defineCommand({
  meta: {
    name: 'votes',
    description: 'Show vote counts and individual vote rationales.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await fetchBattle(args.id);
      if (!battle) { consola.warn('Battle not found or not public.'); return; }

      const list = battle.votes as Array<Record<string, unknown>> | undefined;

      if (args.json) { printJson({ counts: { a: battle.vote_count_a, b: battle.vote_count_b, draw: battle.vote_count_draw }, votes: list }); return; }

      consola.info('A: %s  B: %s  Draw: %s',
        battle.vote_count_a ?? 0,
        battle.vote_count_b ?? 0,
        battle.vote_count_draw ?? 0
      );

      if (list?.length) {
        for (const v of list) {
          consola.info(
            '  %s — %s',
            String(v.vote_value || '-'),
            v.rationale ? String(v.rationale).substring(0, 60) : '(no rationale)'
          );
        }
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect scorecards
// ---------------------------------------------------------------------------
const scorecards = defineCommand({
  meta: {
    name: 'scorecards',
    description: 'Show rubric evaluation scorecards.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await fetchBattle(args.id);
      if (!battle) { consola.warn('Battle not found or not public.'); return; }

      const list = battle.scorecards as Array<Record<string, unknown>> | undefined;
      if (!list?.length) { consola.info('No scorecards.'); return; }

      if (args.json) { printJson(list); return; }

      printTable(
        ['Contender', 'Criterion', 'Result', 'Explanation'],
        list.map((s) => [
          String(s.contender_id || '-').substring(0, 8),
          String(s.criterion_title || s.rubric_criterion_id || '-'),
          String(s.result || '-'),
          String(s.explanation || '-').substring(0, 40),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect diff
// ---------------------------------------------------------------------------
const diff = defineCommand({
  meta: {
    name: 'diff',
    description: 'Side-by-side diff of two submissions in a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    a: {
      type: 'string',
      description: 'Contender A submission UUID',
      required: true,
    },
    b: {
      type: 'string',
      description: 'Contender B submission UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output both submissions as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_submission_diff',
        {
          p_battle_id: args.id,
          p_submission_a_id: args.a,
          p_submission_b_id: args.b,
        }
      );

      if (!result) {
        consola.warn('Could not retrieve submissions for diff.');
        return;
      }

      if (args.json) {
        printJson(result);
        return;
      }

      const aText = String((result.submission_a as Record<string, unknown>)?.content_text || '(empty)');
      const bText = String((result.submission_b as Record<string, unknown>)?.content_text || '(empty)');

      consola.info('=== Submission A (%s) ===', args.a.substring(0, 8));
      consola.log(aText.substring(0, 500));
      consola.info('\n=== Submission B (%s) ===', args.b.substring(0, 8));
      consola.log(bText.substring(0, 500));
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect tool-usage — per-workflow tool invocation rollup for an AI lenser
// ---------------------------------------------------------------------------
interface ToolInvocationRollupRow {
  workflow_id: string
  workflow_title: string | null
  tool_id: string
  total_invocations: number
  approved_count: number
  rejected_count: number
  last_invoked_at: string | null
}

const toolUsage = defineCommand({
  meta: {
    name: 'tool-usage',
    description:
      'Rollup of tool invocations grouped by workflow + tool for an AI lenser over the last N days.',
  },
  args: {
    agent: {
      type: 'string',
      description: 'AI Lenser UUID',
      required: true,
    },
    days: {
      type: 'string',
      description: 'Lookback window in days (default 7)',
      default: '7',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const days = Number.parseInt(args.days, 10)
    if (!Number.isFinite(days) || days <= 0) {
      consola.error('Invalid --days "%s" — must be a positive integer.', args.days)
      process.exitCode = 1
      return
    }

    try {
      const rows = await callRpc<ToolInvocationRollupRow[]>(
        'fn_get_tool_invocation_rollup',
        { p_ai_lenser_id: args.agent, p_days: days },
        { requireAuth: true }
      )

      if (!rows || rows.length === 0) {
        consola.info('No tool invocations recorded in the last %d day(s).', days)
        return
      }

      if (args.json) {
        printJson(rows)
        return
      }

      printTable(
        ['Workflow', 'Tool', 'Total', 'Approved', 'Rejected', 'Last Invoked'],
        rows.map((r) => [
          truncate(r.workflow_title || r.workflow_id, 24),
          truncate(r.tool_id, 24),
          String(r.total_invocations ?? 0),
          String(r.approved_count ?? 0),
          String(r.rejected_count ?? 0),
          r.last_invoked_at ? new Date(r.last_invoked_at).toLocaleString() : '—',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ---------------------------------------------------------------------------
// inspect submission — trust checklist for a battle submission
// ---------------------------------------------------------------------------
const submissionTrust = defineCommand({
  meta: {
    name: 'submission',
    description: 'Show trust evaluation checklist for a battle submission.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Submission UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const trust = await callRpc<{
        submission_id: string;
        trust_level: string;
        factors: Record<string, boolean>;
        attestation_id: string | null;
        evaluated_at: string;
      }>('fn_get_submission_trust', { p_submission_id: args.id });

      if (!trust) {
        consola.warn('No trust evaluation found for submission %s', args.id);
        return;
      }

      if (args.json) { printJson(trust); return; }

      consola.info('Trust Level: %s', trust.trust_level.toUpperCase());
      consola.info('Evaluated:   %s', new Date(trust.evaluated_at).toLocaleString());
      consola.info('');
      consola.info('Checks:');
      for (const [key, passed] of Object.entries(trust.factors ?? {})) {
        consola.info('  %s %s', passed ? '[✓]' : '[✗]', key);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// inspect execution — attestation detail for an execution run
// ---------------------------------------------------------------------------
const executionDetail = defineCommand({
  meta: {
    name: 'execution',
    description: 'Show attestation and trust metadata for an execution run.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Execution run UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const attestation = await callRpc<{
        id: string;
        run_id: string;
        device_id: string | null;
        signed: boolean;
        gateway_verified: boolean;
        device_trusted: boolean;
        policy_passed: boolean;
        workflow_hash: string | null;
        lens_hash: string | null;
        agent_config_hash: string | null;
        runner_version: string | null;
        cli_version: string | null;
        created_at: string;
      }>('fn_execution_attestation_get', { p_run_id: args.id });

      if (!attestation) {
        consola.info('No attestation recorded for this execution run.');
        consola.info('Tip: join a battle with --runner local to generate execution attestations.');
        return;
      }

      if (args.json) { printJson(attestation); return; }

      consola.info('Run ID:          %s', attestation.run_id);
      consola.info('Device ID:       %s', attestation.device_id ?? '—');
      consola.info('Signed:          %s', attestation.signed ? 'yes' : 'no');
      consola.info('Gateway verified:%s', attestation.gateway_verified ? 'yes' : 'no');
      consola.info('Device trusted:  %s', attestation.device_trusted ? 'yes' : 'no');
      consola.info('Policy passed:   %s', attestation.policy_passed ? 'yes' : 'no');
      consola.info('Workflow hash:   %s', attestation.workflow_hash ?? '—');
      consola.info('Lens hash:       %s', attestation.lens_hash ?? '—');
      consola.info('Runner version:  %s', attestation.runner_version ?? '—');
      consola.info('CLI version:     %s', attestation.cli_version ?? '—');
      consola.info('Recorded at:     %s', new Date(attestation.created_at).toLocaleString());
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// Root command (also keeps backward-compatible flat mode)
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'inspect',
    description: 'Inspect battles, submissions, trust, and execution attestations.',
  },
  subCommands: {
    contenders,
    submissions,
    votes,
    scorecards,
    diff,
    'tool-usage': toolUsage,
    submission: submissionTrust,
    execution: executionDetail,
  },
});
