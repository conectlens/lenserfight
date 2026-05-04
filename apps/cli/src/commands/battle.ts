import { defineCommand } from 'citty';
import consola from 'consola';
import { type PrivateBattleFrontmatter } from '@lenserfight/types';
import { callRpc, handleError } from '../utils/api';
import {
  buildWorkflowSimulationReport,
  parseAutomationDocument,
  writeWorkflowSimulationArtifacts,
} from '../utils/automation-objects';
import { printTable, printJson, truncate } from '../utils/output';

// ---------------------------------------------------------------------------
// battle create
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new battle on LenserFight Cloud.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Battle title',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe slug (e.g. my-battle-2026)',
      required: true,
    },
    task: {
      type: 'string',
      description: 'Task prompt — the challenge participants must respond to',
      required: true,
    },
    'rubric-id': {
      type: 'string',
      description: 'Rubric UUID used to score submissions (optional)',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_create',
        {
          p_title: args.title,
          p_slug: args.slug,
          p_task_prompt: args.task,
          p_rubric_id: args['rubric-id'] || null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(battle);
        return;
      }

      consola.success('Battle created.');
      consola.info('ID:     %s', battle['id']);
      consola.info('Title:  %s', battle['title']);
      consola.info('Status: %s', battle['status']);
      consola.info('');
      consola.info('Next steps:');
      consola.info('  lf battle open %s         — open for entries', battle['id']);
      consola.info('  lf battle invite %s --email <email>', battle['id']);
      consola.info('  lf battle view %s', battle['id']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle join
// ---------------------------------------------------------------------------
const join = defineCommand({
  meta: {
    name: 'join',
    description: 'Join an open battle as a contender.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_join',
        { p_battle_id: args.id },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result ?? { battle_id: args.id, joined: true });
        return;
      }

      consola.success('Joined battle %s.', args.id);
      consola.info('');
      consola.info('Submit your entry:');
      consola.info('  lf battle submit %s --text "your response"', args.id);
      consola.info('  lf run exec --prompt "..." --model claude-sonnet-4-6 --byok anthropic  (then submit the output)');
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle list
// ---------------------------------------------------------------------------
const list = defineCommand({
  meta: {
    name: 'list',
    description: 'List public battles on LenserFight Cloud.',
  },
  args: {
    status: {
      type: 'string',
      description: 'Filter by status: draft | open | voting | scoring | published',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Maximum results',
      default: '20',
    },
    offset: {
      type: 'string',
      description: 'Pagination offset',
      default: '0',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battles = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_list_public',
        {
          p_limit: parseInt(args.limit, 10),
          p_offset: parseInt(args.offset, 10),
        }
      );

      if (!Array.isArray(battles) || battles.length === 0) {
        consola.info('No public battles found.');
        return;
      }

      const filtered = args.status
        ? battles.filter((b) => b['status'] === args.status)
        : battles;

      if (args.json) {
        printJson(filtered);
        return;
      }

      printTable(
        ['ID', 'Title', 'Status', 'Task'],
        filtered.map((b) => [
          String(b['id'] ?? '').slice(0, 8) + '…',
          truncate(String(b['title'] ?? ''), 32),
          String(b['status'] ?? ''),
          truncate(String(b['task_prompt'] ?? ''), 48),
        ])
      );
      consola.info('%d battle(s) shown.', filtered.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle view
// ---------------------------------------------------------------------------
const view = defineCommand({
  meta: {
    name: 'view',
    description: 'Show details of a battle.',
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
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      if (args.json) {
        printJson(battle);
        return;
      }

      consola.log('');
      consola.log('  Title:   %s', battle['title']);
      consola.log('  ID:      %s', battle['id']);
      consola.log('  Status:  %s', battle['status']);
      consola.log('  Task:    %s', battle['task_prompt']);
      if (battle['voting_opens_at'])  consola.log('  Voting opens:  %s', battle['voting_opens_at']);
      if (battle['voting_closes_at']) consola.log('  Voting closes: %s', battle['voting_closes_at']);
      consola.log('');
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle run (file-first private battle scaffold)
// ---------------------------------------------------------------------------
const run = defineCommand({
  meta: {
    name: 'run',
    description: 'Simulate or execute a PRIVATE_BATTLE.md locally.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to PRIVATE_BATTLE.md (defaults to ./PRIVATE_BATTLE.md)',
      required: false,
    },
    execute: {
      type: 'boolean',
      description: 'Actually call AI providers and stream outputs (requires provider/model in participant frontmatter)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output the generated battle summary as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const filePath = args.file || 'PRIVATE_BATTLE.md'
    const parsed = parseAutomationDocument(filePath)
    if (!parsed.ok || parsed.kind !== 'private_battle' || !parsed.document) {
      consola.error('Private battle validation failed for %s', filePath)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as PrivateBattleFrontmatter
    const participants = (frontmatter.participants ?? []).map((participant) => `${participant.type}:${participant.ref}`)

    // ── Execution mode ───────────────────────────────────────────────────────
    if (args.execute) {
      const execParticipants = (frontmatter.participants ?? []).filter(
        (p) => p.provider && p.model
      );
      if (execParticipants.length < 2) {
        consola.error(
          'Execution requires at least 2 participants with `provider` and `model` set in frontmatter.'
        );
        consola.info('Example frontmatter:');
        consola.info('  participants:');
        consola.info('    - type: model');
        consola.info('      ref: claude');
        consola.info('      provider: anthropic');
        consola.info('      model: claude-sonnet-4-6');
        process.exitCode = 1;
        return;
      }

      // Build a local battle state from the frontmatter and run it
      const { localBattleStore: lbs, localBattleRunner: lbr } = await import('../utils/local-battle-engine');
      const state = lbs.create(
        frontmatter.name ?? frontmatter.id ?? 'PRIVATE_BATTLE',
        String((parsed.document as any).body ?? frontmatter.name ?? 'Complete the task.')
      );

      // Add up to 2 contenders
      const [pA, pB] = execParticipants;
      lbs.addContender(state.id, {
        slot: 'A',
        label: pA.ref,
        provider: pA.provider!,
        model: pA.model!,
        keyVar: pA.key_var,
      });
      lbs.addContender(state.id, {
        slot: 'B',
        label: pB.ref,
        provider: pB.provider!,
        model: pB.model!,
        keyVar: pB.key_var,
      });

      const loaded = lbs.load(state.id);
      consola.start('Executing %s…', frontmatter.name ?? frontmatter.id);
      const RESET = '\x1b[0m', BLUE = '\x1b[34m', GREEN = '\x1b[32m';

      const result = await lbr.run(loaded, (slot, delta) => {
        const color = slot === 'A' ? BLUE : GREEN;
        process.stdout.write(`${color}[${slot}]${RESET} ${delta}`);
      });

      process.stdout.write('\n\n');
      lbs.markExecuted(state.id, result);

      // Write result files alongside the source file
      const { writeFileSync: wfs } = require('node:fs') as typeof import('node:fs');
      const { resolve: res } = require('node:path') as typeof import('node:path');
      const base = (frontmatter.slug ?? frontmatter.id ?? 'battle').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
      const resultMd = res(process.cwd(), `${base}.result.md`);
      const resultJson = res(process.cwd(), `${base}.result.json`);
      wfs(resultMd, `# ${frontmatter.name ?? base} — Results\n\n## Contender A (${pA.provider}/${pA.model})\n\n${result.A}\n\n---\n\n## Contender B (${pB.provider}/${pB.model})\n\n${result.B}\n`, 'utf-8');
      wfs(resultJson, JSON.stringify({ ...result, battle: state }, null, 2), 'utf-8');

      if (args.json) { printJson({ ...result, resultMd, resultJson }); return; }
      consola.success('Execution complete in %dms.', result.durationMs);
      consola.info('Results: %s', resultMd);
      consola.info('JSON:    %s', resultJson);
      consola.info('');
      consola.info('Vote: lf battle local vote --slot A|B|draw --id %s', state.id.slice(0, 8));
      return;
    }

    // ── Simulation-only mode (original behaviour) ────────────────────────────
    const summary = {
      source: {
        kind: 'private_battle',
        id: frontmatter.id,
        name: frontmatter.name,
      },
      participants,
      evaluation_method: frontmatter.evaluation_method ?? 'unspecified',
      metrics: frontmatter.metrics ?? [],
      generated_at: new Date().toISOString(),
    }

    const report = buildWorkflowSimulationReport(
      frontmatter.name ?? frontmatter.id,
      participants.length >= 2 ? 'ready' : 'blocked',
      participants.length > 0 ? participants : ['No participants were declared in the battle spec.']
    )
    const artifacts = writeWorkflowSimulationArtifacts(frontmatter.slug ?? frontmatter.id, summary, report)

    if (args.json) {
      printJson({ ...summary, artifacts })
      return
    }

    consola.success('Simulated private battle %s', frontmatter.name ?? frontmatter.id)
    consola.info('Participants: %d', participants.length)
    consola.info('JSON report: %s', artifacts.jsonPath)
    consola.info('Markdown report: %s', artifacts.reportPath)
    if (participants.some((_, i) => (frontmatter.participants?.[i]?.provider))) {
      consola.info('')
      consola.info('Tip: participants have provider/model set — run with --execute to actually call AI:')
      consola.info('  lf battle run %s --execute', filePath)
    }
  },
})

// ---------------------------------------------------------------------------
// battle submit
// ---------------------------------------------------------------------------
const submit = defineCommand({
  meta: {
    name: 'submit',
    description: 'Submit your entry to an open battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    text: {
      type: 'string',
      description: 'Inline text submission',
      default: '',
    },
    url: {
      type: 'string',
      description: 'External URL submission (mutually exclusive with --text)',
      default: '',
    },
    'run-id': {
      type: 'string',
      description: 'Execution run ID — attach a Cloud execution run as your submission',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.text && !args.url && !args['run-id']) {
      consola.error('Provide one of: --text, --url, or --run-id');
      consola.info('Tip: run `lf run exec --prompt "..." --model <model> --byok <provider>` first, then submit the output with --text');
      process.exitCode = 1;
      return;
    }

    if (args.text && args.url) {
      consola.error('Provide only one of --text or --url, not both.');
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_submit',
        {
          p_battle_id: args.id,
          p_content_text: args.text || null,
          p_content_url: args.url || null,
          p_content_media: null,
          p_execution_run_id: args['run-id'] || null,
          p_artifact_id: null,
          p_source_type: args['run-id'] ? 'execution_run' : args.url ? 'url' : 'text',
          p_adapter_id: null,
          p_model_id: null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result ?? { battle_id: args.id, submitted: true });
        return;
      }

      consola.success('Submission recorded for battle %s.', args.id);
      if (result?.['id']) consola.info('Submission ID: %s', result['id']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle open
// ---------------------------------------------------------------------------
const open = defineCommand({
  meta: {
    name: 'open',
    description: 'Open a draft battle for entries (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_open', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s is now open for entries.', args.id);
      consola.info('Share the battle link or invite participants:');
      consola.info('  lf battle invite %s --email <email>', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle start-voting
// ---------------------------------------------------------------------------
const startVoting = defineCommand({
  meta: {
    name: 'start-voting',
    description: 'Transition an open battle into voting phase (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    'closes-at': {
      type: 'string',
      description: 'Voting deadline as ISO 8601 timestamp (e.g. 2026-05-10T18:00:00Z)',
      required: true,
    },
  },
  async run({ args }) {
    const closesAt = new Date(args['closes-at']);
    if (isNaN(closesAt.getTime())) {
      consola.error('Invalid --closes-at value. Use ISO 8601 format: 2026-05-10T18:00:00Z');
      process.exitCode = 1;
      return;
    }

    try {
      await callRpc(
        'fn_battles_start_voting',
        { p_battle_id: args.id, p_voting_closes_at: closesAt.toISOString() },
        { requireAuth: true }
      );
      consola.success('Voting started. Closes at %s.', closesAt.toISOString());
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle finalize
// ---------------------------------------------------------------------------
const finalize = defineCommand({
  meta: {
    name: 'finalize',
    description: 'Finalize scoring after voting closes (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_finalize', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s finalized.', args.id);
      consola.info('View results: lf battle leaderboard %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle publish
// ---------------------------------------------------------------------------
const publish = defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a finalized battle — makes results publicly visible.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_battles_publish', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s published.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle leaderboard
// ---------------------------------------------------------------------------
const leaderboard = defineCommand({
  meta: {
    name: 'leaderboard',
    description: 'Show the scoring leaderboard for a battle.',
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
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_leaderboard',
        { p_battle_id: args.id }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No scores yet for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['Rank', 'Handle', 'Score', 'Votes'],
        rows.map((r, i) => [
          String(r['rank'] ?? i + 1),
          String(r['handle'] ?? r['lenser_handle'] ?? '—'),
          String(r['score'] ?? '—'),
          String(r['vote_count'] ?? '—'),
        ])
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle invite
// ---------------------------------------------------------------------------
const invite = defineCommand({
  meta: {
    name: 'invite',
    description: 'Invite a participant to a battle by email.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    email: {
      type: 'string',
      description: 'Email address of the invitee',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_invite',
        { p_battle_id: args.id, p_email: args.email },
        { requireAuth: true }
      );
      consola.success('Invitation sent to %s.', args.email);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle clone
// ---------------------------------------------------------------------------
const clone = defineCommand({
  meta: {
    name: 'clone',
    description: 'Clone an existing battle with a new title and slug.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Source battle UUID',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title for the cloned battle',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'Slug for the cloned battle',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_clone',
        { p_battle_id: args.id, p_title: args.title, p_slug: args.slug },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result);
        return;
      }

      consola.success('Battle cloned.');
      consola.info('New ID:  %s', result?.['id']);
      consola.info('Title:   %s', result?.['title'] ?? args.title);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle delete
// ---------------------------------------------------------------------------
const deleteBattle = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a draft battle (creator only, irreversible).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    confirm: {
      type: 'boolean',
      description: 'Skip confirmation prompt',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.confirm) {
      consola.warn('This will permanently delete battle %s.', args.id);
      consola.info('Re-run with --confirm to proceed.');
      return;
    }

    try {
      await callRpc('fn_battles_delete', { p_battle_id: args.id }, { requireAuth: true });
      consola.success('Battle %s deleted.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle create-from-template
// ---------------------------------------------------------------------------
const createFromTemplate = defineCommand({
  meta: {
    name: 'create-from-template',
    description: 'Create a new draft battle from an existing template.',
  },
  args: {
    'template-id': {
      type: 'positional',
      description: 'Template UUID',
      required: true,
    },
    title: {
      type: 'string',
      description: 'Title for the new battle',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-safe slug for the new battle',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battles_create_from_template',
        {
          p_template_id: args['template-id'],
          p_title: args.title,
          p_slug: args.slug,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result);
        return;
      }

      consola.success('Battle created from template.');
      consola.info('ID:     %s', result?.['id']);
      consola.info('Title:  %s', result?.['title'] ?? args.title);
      consola.info('Status: %s', result?.['status']);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle vote
// ---------------------------------------------------------------------------
const vote = defineCommand({
  meta: {
    name: 'vote',
    description: 'Submit a vote for a battle in voting phase.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    contender: {
      type: 'string',
      description: 'Contender ID you are voting for',
      required: true,
    },
    value: {
      type: 'string',
      description: "Vote value: 'contender_a' | 'contender_b' | 'draw'",
      required: true,
    },
    draw: {
      type: 'boolean',
      description: 'Mark this vote as a draw',
      default: false,
    },
    rationale: {
      type: 'string',
      description: 'Optional rationale for your vote',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output result as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const allowedValues = ['contender_a', 'contender_b', 'draw'];
    if (!allowedValues.includes(args.value)) {
      consola.error(
        "Invalid --value. Use one of: 'contender_a', 'contender_b', 'draw'"
      );
      process.exitCode = 1;
      return;
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_submit_vote',
        {
          p_battle_id: args.id,
          p_voted_contender_id: args.contender,
          p_vote_value: args.value,
          p_is_draw: args.draw,
          p_rationale: args.rationale || null,
        },
        { requireAuth: true }
      );

      if (args.json) {
        printJson(result ?? { battle_id: args.id, voted: true });
        return;
      }

      consola.success('Vote submitted for battle %s.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle close-voting
// ---------------------------------------------------------------------------
const closeVoting = defineCommand({
  meta: {
    name: 'close-voting',
    description:
      'Close the voting phase and transition battle to scoring (creator only).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battle_close_voting',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success(
        'Voting closed for battle %s. Now in scoring phase.',
        args.id
      );
      consola.info('Next: lf battle finalize %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle close
// ---------------------------------------------------------------------------
const closeBattle = defineCommand({
  meta: {
    name: 'close',
    description:
      'Close a battle (alternate path — transitions to closed state).',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_close',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('Battle %s closed.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle archive
// ---------------------------------------------------------------------------
const archive = defineCommand({
  meta: {
    name: 'archive',
    description: 'Archive a battle — removes it from the public feed.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_archive',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success('Battle %s archived.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle retract
// ---------------------------------------------------------------------------
const retract = defineCommand({
  meta: {
    name: 'retract',
    description: 'Retract a published battle — reverts it to draft.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_battles_retract',
        { p_battle_id: args.id },
        { requireAuth: true }
      );
      consola.success(
        'Battle %s retracted and reverted to draft.',
        args.id
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle comments
// ---------------------------------------------------------------------------
const comments = defineCommand({
  meta: {
    name: 'comments',
    description: 'Fetch paginated comments for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Maximum number of comments to return',
      default: '20',
    },
    'before-ts': {
      type: 'string',
      description:
        'Pagination cursor: return comments before this ISO timestamp',
      default: '',
    },
    'before-id': {
      type: 'string',
      description:
        'Pagination cursor: return comments before this comment UUID',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_battle_comments',
        {
          p_battle_id: args.id,
          p_limit: parseInt(args.limit, 10),
          p_before_ts: args['before-ts'] || null,
          p_before_id: args['before-id'] || null,
        }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No comments found for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['ID', 'Author', 'Body', 'Created At'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['author_handle'] ?? r['handle'] ?? '—'),
          truncate(String(r['body'] ?? ''), 60),
          String(r['created_at'] ?? ''),
        ])
      );
      consola.info('%d comment(s) shown.', rows.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle messages
// ---------------------------------------------------------------------------
const messages = defineCommand({
  meta: {
    name: 'messages',
    description: 'Fetch paginated global messages for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    limit: {
      type: 'string',
      description: 'Maximum number of messages to return',
      default: '20',
    },
    'before-ts': {
      type: 'string',
      description:
        'Pagination cursor: return messages before this ISO timestamp',
      default: '',
    },
    'before-id': {
      type: 'string',
      description:
        'Pagination cursor: return messages before this message UUID',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_global_messages',
        {
          p_battle_id: args.id,
          p_limit: parseInt(args.limit, 10),
          p_before_ts: args['before-ts'] || null,
          p_before_id: args['before-id'] || null,
        }
      );

      if (!Array.isArray(rows) || rows.length === 0) {
        consola.info('No messages found for battle %s.', args.id);
        return;
      }

      if (args.json) {
        printJson(rows);
        return;
      }

      printTable(
        ['ID', 'Sender', 'Role', 'Body', 'Sent At'],
        rows.map((r) => [
          String(r['id'] ?? '').slice(0, 8) + '…',
          String(r['sender_handle'] ?? '—'),
          String(r['sender_role'] ?? '—'),
          truncate(String(r['body'] ?? ''), 48),
          String(r['created_at'] ?? ''),
        ])
      );
      consola.info('%d message(s) shown.', rows.length);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle post-message
// ---------------------------------------------------------------------------
const postMessage = defineCommand({
  meta: {
    name: 'post-message',
    description: 'Post a global moderator/system message to a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    body: {
      type: 'string',
      description: 'Message body text',
      required: true,
    },
    'sender-handle': {
      type: 'string',
      description: 'Handle of the sender',
      required: true,
    },
    'sender-role': {
      type: 'string',
      description: "Sender role: 'moderator' | 'system' | 'creator'",
      default: 'moderator',
    },
  },
  async run({ args }) {
    try {
      await callRpc(
        'fn_post_global_message',
        {
          p_battle_id: args.id,
          p_body: args.body,
          p_sender_handle: args['sender-handle'],
          p_sender_role: args['sender-role'],
        },
        { requireAuth: true }
      );
      consola.success('Message posted to battle %s.', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle feed
// ---------------------------------------------------------------------------
const feed = defineCommand({
  meta: {
    name: 'feed',
    description:
      'Fetch the cursor-based public battles feed (replaces deprecated list).',
  },
  args: {
    status: {
      type: 'string',
      description:
        'Filter by status: draft | open | voting | scoring | published',
      default: '',
    },
    'battle-type': {
      type: 'string',
      description: 'Filter by battle type',
      default: '',
    },
    limit: {
      type: 'string',
      description: 'Maximum results per page',
      default: '20',
    },
    cursor: {
      type: 'string',
      description: 'Pagination cursor returned from previous feed call',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<
        Array<Record<string, unknown>> | Record<string, unknown>
      >('fn_get_battles_feed', {
        p_status: args.status || null,
        p_battle_type: args['battle-type'] || null,
        p_limit: parseInt(args.limit, 10),
        p_cursor: args.cursor || null,
      });

      const battles = Array.isArray(result)
        ? result
        : ((result as Record<string, unknown>)?.[
            'data'
          ] as Array<Record<string, unknown>> | undefined) ?? [];

      if (battles.length === 0) {
        consola.info('No battles in feed.');
        return;
      }

      if (args.json) {
        printJson(result);
        return;
      }

      printTable(
        ['ID', 'Title', 'Status', 'Type'],
        battles.map((b) => [
          String(b['id'] ?? '').slice(0, 8) + '…',
          truncate(String(b['title'] ?? ''), 32),
          String(b['status'] ?? ''),
          String(b['battle_type'] ?? '—'),
        ])
      );

      const next = (result as Record<string, unknown>)?.['next_cursor'];
      if (next) {
        consola.info('Next page: lf battle feed --cursor %s', next);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle local — offline dev battle subcommand group
// ---------------------------------------------------------------------------
import {
  localBattleStore,
  localBattleRunner,
  type LocalContenderConfig,
} from '../utils/local-battle-engine';

const localInit = defineCommand({
  meta: { name: 'init', description: 'Create a new local battle (no cloud required).' },
  args: {
    name:  { type: 'string', description: 'Battle name', required: true },
    task:  { type: 'string', description: 'Task prompt both contenders will answer', required: true },
    json:  { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = localBattleStore.create(args.name, args.task);
      if (args.json) { printJson(state); return; }
      consola.success('Local battle created.');
      consola.info('ID:   %s', state.id);
      consola.info('Name: %s', state.name);
      consola.info('');
      consola.info('Next steps:');
      consola.info('  lf battle local add-contender A --provider anthropic --model claude-haiku-4-5');
      consola.info('  lf battle local add-contender B --provider ollama    --model llama3');
      consola.info('  lf battle local run %s', state.id.slice(0, 8));
    } catch (err) { handleError(err); }
  },
});

const localAddContender = defineCommand({
  meta: { name: 'add-contender', description: 'Add or replace a contender slot (A or B).' },
  args: {
    slot:     { type: 'positional', description: 'A or B', required: true },
    provider: { type: 'string',     description: 'Provider: anthropic | openai | google | mistral | ollama', required: true },
    model:    { type: 'string',     description: 'Model key, e.g. claude-sonnet-4-6', required: true },
    label:    { type: 'string',     description: 'Display label (defaults to model name)', default: '' },
    'key-var':{ type: 'string',     description: 'Custom env var for API key override', default: '' },
    id:       { type: 'string',     description: 'Local battle ID (omit to use most recent)', default: '' },
    json:     { type: 'boolean',    description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    const slot = args.slot.toUpperCase() as 'A' | 'B';
    if (slot !== 'A' && slot !== 'B') {
      consola.error('Slot must be A or B'); process.exitCode = 1; return;
    }
    try {
      const state = args.id ? localBattleStore.load(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found. Run `lf battle local init` first.'); process.exitCode = 1; return; }
      const cfg: LocalContenderConfig = {
        slot,
        label: args.label || args.model,
        provider: args.provider,
        model: args.model,
        keyVar: args['key-var'] || undefined,
      };
      const updated = localBattleStore.addContender(state.id, cfg);
      if (args.json) { printJson(updated); return; }
      consola.success('Contender %s set: %s/%s', slot, args.provider, args.model);
      consola.info('Status: %s', updated.status);
    } catch (err) { handleError(err); }
  },
});

const localRun = defineCommand({
  meta: { name: 'run', description: 'Execute both contenders locally using BYOK keys.' },
  args: {
    id:   { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    json: { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found. Run `lf battle local init` first.'); process.exitCode = 1; return; }
      if (state.status === 'draft') {
        consola.error('Add both contenders first:');
        consola.info('  lf battle local add-contender A --provider <p> --model <m>');
        consola.info('  lf battle local add-contender B --provider <p> --model <m>');
        process.exitCode = 1; return;
      }

      const cA = state.contenders.find((c) => c.slot === 'A')!;
      const cB = state.contenders.find((c) => c.slot === 'B')!;
      consola.start('Running "%s"', state.name);
      consola.info('A: %s/%s  vs  B: %s/%s', cA.provider, cA.model, cB.provider, cB.model);
      consola.info('Task: %s', state.task);
      process.stdout.write('\n');

      const RESET = '\x1b[0m', BLUE = '\x1b[34m', GREEN = '\x1b[32m';
      const bufA: string[] = [], bufB: string[] = [];

      const result = await localBattleRunner.run(
        state,
        (slot, delta) => {
          if (slot === 'A') { bufA.push(delta); process.stdout.write(`${BLUE}[A]${RESET} ${delta}`); }
          else              { bufB.push(delta); process.stdout.write(`${GREEN}[B]${RESET} ${delta}`); }
        },
      );

      process.stdout.write('\n\n');
      const updated = localBattleStore.markExecuted(state.id, result);

      if (args.json) { printJson(updated); return; }

      consola.success('Execution complete in %dms.', result.durationMs);
      consola.info('Tokens — A: %d  B: %d', result.tokensA, result.tokensB);
      consola.info('');
      consola.info('Next: lf battle local vote %s --slot A|B|draw', state.id.slice(0, 8));
    } catch (err) { handleError(err); }
  },
});

const localVote = defineCommand({
  meta: { name: 'vote', description: 'Cast a vote on a locally executed battle.' },
  args: {
    slot:      { type: 'string',  description: 'A | B | draw', required: true },
    id:        { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    rationale: { type: 'string',  description: 'Optional rationale', default: '' },
    json:      { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    const slot = args.slot.toLowerCase() as 'a' | 'b' | 'draw';
    if (!['a', 'b', 'draw'].includes(slot)) {
      consola.error('--slot must be A, B, or draw'); process.exitCode = 1; return;
    }
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found.'); process.exitCode = 1; return; }
      if (state.status !== 'executed' && state.status !== 'voted') {
        consola.error('Run the battle first: lf battle local run'); process.exitCode = 1; return;
      }
      const vote = {
        slot: (slot === 'a' ? 'A' : slot === 'b' ? 'B' : 'draw') as 'A' | 'B' | 'draw',
        rationale: args.rationale || undefined,
        votedAt: new Date().toISOString(),
      };
      const updated = localBattleStore.recordVote(state.id, vote);
      if (args.json) { printJson(updated); return; }
      consola.success('Vote recorded: %s', vote.slot);
      if (args.rationale) consola.info('Rationale: %s', args.rationale);
    } catch (err) { handleError(err); }
  },
});

const localStatus = defineCommand({
  meta: { name: 'status', description: 'Show the current state and vote tally of a local battle.' },
  args: {
    id:   { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.info('No local battles yet. Run `lf battle local init`.'); return; }
      if (args.json) { printJson(state); return; }

      consola.log('');
      consola.log('  Name:   %s', state.name);
      consola.log('  ID:     %s', state.id);
      consola.log('  Status: %s', state.status);
      consola.log('  Task:   %s', state.task);

      if (state.contenders.length) {
        consola.log('');
        for (const c of state.contenders) {
          consola.log('  Contender %s: %s/%s', c.slot, c.provider, c.model);
        }
      }

      if (state.votes.length) {
        const tally = { A: 0, B: 0, draw: 0 };
        for (const v of state.votes) tally[v.slot]++;
        consola.log('');
        consola.log('  Votes — A: %d  B: %d  Draw: %d', tally.A, tally.B, tally.draw);
        const winner = tally.A > tally.B ? 'A' : tally.B > tally.A ? 'B' : tally.draw > 0 ? 'Draw' : 'Tied';
        consola.log('  Winner: %s', winner);
      }
      consola.log('');
    } catch (err) { handleError(err); }
  },
});

const localList = defineCommand({
  meta: { name: 'list', description: 'List all local battles.' },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const all = localBattleStore.list();
      if (!all.length) { consola.info('No local battles. Run `lf battle local init` to create one.'); return; }
      if (args.json) { printJson(all); return; }
      printTable(
        ['ID', 'Name', 'Status', 'Contenders'],
        all.map((s) => [
          s.id.slice(0, 8) + '…',
          truncate(s.name, 32),
          s.status,
          s.contenders.map((c) => `${c.slot}:${c.provider}/${c.model}`).join('  ') || '—',
        ])
      );
    } catch (err) { handleError(err); }
  },
});

const localPush = defineCommand({
  meta: { name: 'push', description: 'Push a local battle to LenserFight Cloud as a draft.' },
  args: {
    id:    { type: 'string',  description: 'Local battle ID (omit to use most recent)', default: '' },
    slug:  { type: 'string',  description: 'Cloud URL slug (required)', required: true },
    json:  { type: 'boolean', description: 'Output result as JSON', default: false },
  },
  async run({ args }) {
    try {
      const state = args.id ? localBattleStore.resolve(args.id) : localBattleStore.list()[0];
      if (!state) { consola.error('No local battles found.'); process.exitCode = 1; return; }

      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_create',
        {
          p_title: state.name,
          p_slug: args.slug,
          p_task_prompt: state.task,
          p_rubric_id: null,
        },
        { requireAuth: true }
      );

      if (args.json) { printJson(battle); return; }
      consola.success('Local battle "%s" pushed to cloud.', state.name);
      consola.info('Cloud ID:  %s', battle['id']);
      consola.info('Status:    %s', battle['status']);
      consola.info('');
      consola.info('Continue: lf battle open %s', battle['id']);
    } catch (err) { handleError(err); }
  },
});

const local = defineCommand({
  meta: { name: 'local', description: 'Manage offline local battles (no cloud or auth required).' },
  subCommands: {
    init: localInit,
    'add-contender': localAddContender,
    run: localRun,
    vote: localVote,
    status: localStatus,
    list: localList,
    push: localPush,
  },
});

// ---------------------------------------------------------------------------
// battle exec — cloud battle BYOK execution with optional web streaming
// ---------------------------------------------------------------------------
import {
  byokKeyResolver,
  getStreamAdapter as _getStreamAdapter,
} from '@lenserfight/providers';
import type { ProviderMessage as _ProviderMessage } from '@lenserfight/providers';

const exec = defineCommand({
  meta: {
    name: 'exec',
    description: 'Execute a cloud battle with your own API keys (BYOK), optionally streaming tokens to the web UI.',
  },
  args: {
    id:             { type: 'positional', description: 'Battle UUID', required: true },
    'provider-a':   { type: 'string',  description: 'Provider for slot A override', default: '' },
    'model-a':      { type: 'string',  description: 'Model for slot A override', default: '' },
    'provider-b':   { type: 'string',  description: 'Provider for slot B override', default: '' },
    'model-b':      { type: 'string',  description: 'Model for slot B override', default: '' },
    byok:           { type: 'boolean', description: 'Use local BYOK keys instead of cloud billing', default: false },
    'stream-to-web':{ type: 'boolean', description: 'Broadcast tokens to web UI via Supabase Realtime', default: false },
    slot:           { type: 'string',  description: 'Execute only one slot: A | B | both', default: 'both' },
    json:           { type: 'boolean', description: 'Output summary as JSON', default: false },
  },
  async run({ args }) {
    const { BattleStreamBroadcaster } = await import('../utils/battle-stream-broadcaster');

    try {
      // 1. Fetch battle
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );
      if (!battle) { consola.error('Battle not found or not public.'); process.exitCode = 1; return; }

      consola.start('Executing battle: %s', battle['title']);
      consola.info('Task: %s', battle['task_prompt']);

      // 2. Fetch contenders
      const contenders = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      // 3. Fetch execution configs for each contender
      const configsRaw = await callRpc<Array<Record<string, unknown>>>(
        'fn_get_battle_execution_configs',
        { p_battle_id: args.id }
      ).catch(() => [] as Array<Record<string, unknown>>);

      const cfgA = configsRaw.find((c) => c['slot'] === 'A') ?? {};
      const cfgB = configsRaw.find((c) => c['slot'] === 'B') ?? {};

      const providerA = (args['provider-a'] || String(cfgA['provider_key'] ?? 'anthropic')) as Parameters<typeof _getStreamAdapter>[0];
      const modelA    = args['model-a']    || String(cfgA['model_key']    ?? 'claude-sonnet-4-6');
      const providerB = (args['provider-b'] || String(cfgB['provider_key'] ?? 'anthropic')) as Parameters<typeof _getStreamAdapter>[0];
      const modelB    = args['model-b']    || String(cfgB['model_key']    ?? 'claude-sonnet-4-6');

      const task = String(battle['task_prompt'] ?? '');
      const messages: _ProviderMessage[] = [{ role: 'user', content: task }];

      const RESET = '\x1b[0m', BLUE = '\x1b[34m', GREEN = '\x1b[32m';

      const runSlot = async (slot: 'A' | 'B', provider: Parameters<typeof _getStreamAdapter>[0], model: string) => {
        const broadcaster = args['stream-to-web']
          ? new BattleStreamBroadcaster()
          : null;

        if (broadcaster) await broadcaster.open(args.id, slot);

        const apiKey = args.byok
          ? byokKeyResolver.resolve(provider)
          : '';

        if (args.byok && !apiKey && provider !== 'ollama') {
          consola.error('[%s] No API key found for provider %s. Set %s_API_KEY env var.', slot, provider, provider.toUpperCase());
          return { slot, output: '', tokens: 0 };
        }

        const adapter = _getStreamAdapter(provider);
        const { url, body, headers } = adapter.buildStreamRequest(model, messages, { maxTokens: 4096 });
        const authHeaders = args.byok ? adapter.authHeader(apiKey) : {};

        consola.start('[%s] Streaming %s/%s…', slot, provider, model);

        const res = await fetch(url, {
          method: 'POST',
          headers: { ...headers, ...authHeaders },
          body,
        });

        if (!res.ok || !res.body) {
          const text = await res.text();
          consola.error('[%s] Provider error %d: %s', slot, res.status, text);
          broadcaster?.broadcastError(`Provider error ${res.status}`);
          await broadcaster?.close();
          return { slot, output: '', tokens: 0 };
        }

        let output = '';
        let tokens = 0;
        let eventType: string | undefined;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        const startedAt = Date.now();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (line.startsWith('event: ')) { eventType = line.slice(7).trim(); continue; }
            if (!line.startsWith('data: ') && !line.trim()) continue;
            const chunk = adapter.parseStreamChunk(line, eventType);
            if (chunk?.content) {
              output += chunk.content;
              tokens++;
              const color = slot === 'A' ? BLUE : GREEN;
              process.stdout.write(`${color}[${slot}]${RESET} ${chunk.content}`);
              broadcaster?.broadcastToken(chunk.content, Date.now() - startedAt);
            }
            if (chunk?.done) break;
          }
        }

        broadcaster?.broadcastEnd({ input_tokens: 0, output_tokens: tokens });
        await broadcaster?.close();
        return { slot, output, tokens };
      };

      const slotArg = args.slot.toUpperCase();
      const slots: Array<['A' | 'B', Parameters<typeof _getStreamAdapter>[0], string]> = [];
      if (slotArg === 'A' || slotArg === 'BOTH') slots.push(['A', providerA, modelA]);
      if (slotArg === 'B' || slotArg === 'BOTH') slots.push(['B', providerB, modelB]);

      process.stdout.write('\n');
      const results = await Promise.all(slots.map(([s, p, m]) => runSlot(s, p, m)));
      process.stdout.write('\n');

      if (args.json) { printJson(results); return; }

      consola.success('Execution complete.');
      printTable(
        ['Slot', 'Provider', 'Model', 'Tokens'],
        results.map((r) => {
          const s = slots.find(([sl]) => sl === r.slot)!;
          return [r.slot, s[1], s[2], String(r.tokens)];
        })
      );
      consola.info('');
      consola.info('If battle transitioned to voting: lf battle start-voting %s --closes-at <iso>', args.id);
    } catch (err) { handleError(err); }
  },
});

// ---------------------------------------------------------------------------
// Root command
// ---------------------------------------------------------------------------
export default defineCommand({
  meta: {
    name: 'battle',
    description: 'Create, join, and manage battles on LenserFight Cloud.',
  },
  subCommands: {
    create,
    join,
    run,
    list,
    view,
    submit,
    open,
    'start-voting': startVoting,
    finalize,
    publish,
    leaderboard,
    invite,
    clone,
    delete: deleteBattle,
    'create-from-template': createFromTemplate,
    vote,
    'close-voting': closeVoting,
    close: closeBattle,
    archive,
    retract,
    comments,
    messages,
    'post-message': postMessage,
    feed,
    local,
    exec,
  },
});
