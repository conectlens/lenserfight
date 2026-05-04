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
    description: 'Simulate a file-first PRIVATE_BATTLE.md locally and emit a report.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to PRIVATE_BATTLE.md',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output the generated battle summary as JSON',
      default: false,
    },
  },
  async run({ args }) {
    const parsed = parseAutomationDocument(args.file)
    if (!parsed.ok || parsed.kind !== 'private_battle' || !parsed.document) {
      consola.error('Private battle validation failed for %s', args.file)
      for (const issue of parsed.issues) {
        consola.error('  - %s: %s', issue.path, issue.message)
      }
      process.exitCode = 1
      return
    }

    const frontmatter = parsed.document.frontmatter as PrivateBattleFrontmatter
    const participants = (frontmatter.participants ?? []).map((participant) => `${participant.type}:${participant.ref}`)
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
  },
});
