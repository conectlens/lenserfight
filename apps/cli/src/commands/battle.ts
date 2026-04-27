import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
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
  },
});
