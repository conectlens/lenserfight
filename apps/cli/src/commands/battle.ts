import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson, truncate, slugify, pastedTextSummary, parseClosesAt } from '../utils/output';

// ---------------------------------------------------------------------------
// battle create
// ---------------------------------------------------------------------------
const create = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new battle in draft status.',
  },
  args: {
    title: {
      type: 'string',
      description: 'Battle title',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'URL-friendly slug (auto-generated from title if omitted)',
    },
    prompt: {
      type: 'string',
      description: 'Task prompt for contenders (supports multi-line paste)',
      required: true,
    },
    rubric: {
      type: 'string',
      description: 'Rubric UUID to attach (optional)',
    },
    template: {
      type: 'string',
      description: 'Template UUID to create from (overrides --prompt)',
    },
  },
  async run({ args }) {
    const resolvedSlug = args.slug || slugify(args.title);

    try {
      if (args.template) {
        const battleId = await callRpc<string>(
          'fn_battles_create_from_template',
          {
            p_template_id: args.template,
            p_title: args.title,
            p_slug: resolvedSlug,
          },
          { requireAuth: true }
        );
        consola.success('Battle created from template: %s (slug: %s)', battleId, resolvedSlug);
        return;
      }

      const promptSummary = pastedTextSummary(args.prompt);
      if (promptSummary) {
        consola.info('Prompt: %s', promptSummary);
      }

      const params: Record<string, unknown> = {
        p_title: args.title,
        p_slug: resolvedSlug,
        p_task_prompt: args.prompt,
      };

      if (args.rubric) {
        params.p_rubric_id = args.rubric;
      }

      const battleId = await callRpc<string>(
        'fn_battles_create',
        params,
        { requireAuth: true }
      );
      consola.success('Battle created: %s (slug: %s)', battleId, resolvedSlug);
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
    description: 'List public battles.',
  },
  args: {
    limit: {
      type: 'string',
      description: 'Number of battles to list',
      default: '10',
    },
    status: {
      type: 'string',
      description: 'Filter by status (e.g., open, voting, published)',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const battles = await callRpc<
        Array<Record<string, unknown>>
      >('fn_battles_list_public', {
        p_limit: parseInt(args.limit, 10),
        p_offset: 0,
      });

      if (!Array.isArray(battles) || battles.length === 0) {
        consola.info('No public battles found.');
        return;
      }

      let filtered = battles;
      if (args.status) {
        filtered = battles.filter((b) => b.status === args.status);
      }

      if (args.json) {
        printJson(filtered);
        return;
      }

      printTable(
        ['ID', 'Status', 'Contenders', 'Title'],
        filtered.map((b) => [
          String(b.id || '-').substring(0, 8),
          String(b.status || '-'),
          String(b.contender_count || 0),
          truncate(String(b.title || 'Untitled'), 40),
        ])
      );
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
    description: 'View a battle by ID.',
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
        consola.warn('Battle not found or not public.');
        return;
      }

      if (args.json) {
        printJson(battle);
        return;
      }

      consola.info('Title:   %s', battle.title);
      consola.info('ID:      %s', battle.id);
      consola.info('Status:  %s', battle.status);
      consola.info('Slug:    %s', battle.slug);
      consola.info('Votes:   A=%s  B=%s  Draw=%s',
        battle.vote_count_a ?? 0,
        battle.vote_count_b ?? 0,
        battle.vote_count_draw ?? 0
      );
      if (battle.winner_contender_id) {
        consola.info('Winner:  %s', battle.winner_contender_id);
      }
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
    description: 'Open a draft battle for contenders.',
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
      await callRpc('fn_battles_open', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle opened: %s', args.id);
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
    description: 'Join a battle as a contender.',
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
      const contenderId = await callRpc<string>('fn_battles_join', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Joined battle as contender: %s', contenderId);
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
    description: 'Submit a response to a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    text: {
      type: 'string',
      description: 'Submission text content',
    },
    file: {
      type: 'string',
      description: 'Path to file with submission content',
    },
    url: {
      type: 'string',
      description: 'URL to submission content',
    },
  },
  async run({ args }) {
    let contentText = args.text || null;
    const contentUrl = args.url || null;

    if (args.file) {
      const { readFileSync } = await import('node:fs');
      try {
        contentText = readFileSync(args.file, 'utf-8');
      } catch (err) {
        consola.error('Failed to read file: %s', (err as Error).message);
        process.exitCode = 1;
        return;
      }
    }

    if (!contentText && !contentUrl) {
      consola.error('Provide --text, --file, or --url for the submission.');
      process.exitCode = 1;
      return;
    }

    if (contentText) {
      const summary = pastedTextSummary(contentText);
      if (summary) consola.info('Content: %s', summary);
    }
    if (contentUrl) {
      consola.info('Content URL: %s', contentUrl);
    }

    try {
      await callRpc('fn_battles_submit', {
        p_battle_id: args.id,
        p_content_text: contentText,
        p_content_url: contentUrl,
        p_content_media: null,
      }, { requireAuth: true });
      consola.success('Submission sent for battle: %s', args.id);
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
    description: 'Begin the voting phase for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    'closes-at': {
      type: 'string',
      description: 'Voting closes at: ISO 8601 timestamp or relative offset (+2h, +30m, +1d)',
      required: true,
    },
  },
  async run({ args }) {
    const closesAt = parseClosesAt(args['closes-at']);
    try {
      await callRpc('fn_battles_start_voting', {
        p_battle_id: args.id,
        p_voting_closes_at: closesAt,
      }, { requireAuth: true });
      consola.success(
        'Voting started for battle %s (closes at %s)',
        args.id,
        closesAt
      );
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
    description: 'Cast a vote on a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    for: {
      type: 'string',
      description: 'Vote for: contender_a, contender_b, or draw',
      required: true,
    },
    rationale: {
      type: 'string',
      description: 'Reason for your vote',
      default: '',
    },
  },
  async run({ args }) {
    const validVotes = ['contender_a', 'contender_b', 'draw'];
    if (!validVotes.includes(args.for)) {
      consola.error(
        'Invalid vote: %s. Must be one of: %s',
        args.for,
        validVotes.join(', ')
      );
      process.exitCode = 1;
      return;
    }

    try {
      await callRpc('fn_battles_vote', {
        p_battle_id: args.id,
        p_vote: args.for,
        p_rationale: args.rationale || null,
      }, { requireAuth: true });
      consola.success('Vote cast: %s', args.for);
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
    description: 'Close voting and determine the winner.',
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
      await callRpc('fn_battles_finalize', {
        p_battle_id: args.id,
      }, { useServiceRole: true });
      consola.success('Battle finalized: %s', args.id);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle publish
// ---------------------------------------------------------------------------
const publishBattle = defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a closed battle.',
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
      await callRpc('fn_battles_publish', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle published: %s', args.id);
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
    description: 'Invite a contender to a battle by email.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    email: {
      type: 'string',
      description: 'Email of the person to invite',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const invitationId = await callRpc<string>('fn_battles_invite', {
        p_battle_id: args.id,
        p_email: args.email,
      }, { requireAuth: true });
      consola.success('Invitation sent: %s', invitationId);
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
    description: 'Delete a draft battle before it goes public.',
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
      await callRpc('fn_battles_delete', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle deleted: %s', args.id);
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
    description: 'Clone an existing battle as a new draft.',
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
      description: 'URL-friendly slug for the cloned battle (auto-generated from title if omitted)',
    },
  },
  async run({ args }) {
    const resolvedSlug = args.slug || slugify(args.title);
    try {
      const battleId = await callRpc<string>('fn_battles_clone', {
        p_battle_id: args.id,
        p_title: args.title,
        p_slug: resolvedSlug,
      }, { requireAuth: true });
      consola.success('Battle cloned: %s (slug: %s)', battleId, resolvedSlug);
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// battle close
// ---------------------------------------------------------------------------
const close = defineCommand({
  meta: {
    name: 'close',
    description: 'Close an open battle to new submissions.',
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
      await callRpc('fn_battles_close', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle closed: %s', args.id);
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
    description: 'Retract a published battle (unpublish).',
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
      await callRpc('fn_battles_retract', {
        p_battle_id: args.id,
      }, { requireAuth: true });
      consola.success('Battle retracted: %s', args.id);
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
    description: 'Show ranked results for a finalized battle.',
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
      const results = await callRpc<Array<Record<string, unknown>>>(
        'fn_battles_leaderboard',
        { p_battle_id: args.id }
      );

      if (!Array.isArray(results) || results.length === 0) {
        consola.info('No results found for battle: %s', args.id);
        return;
      }

      if (args.json) {
        printJson(results);
        return;
      }

      printTable(
        ['Rank', 'Contender', 'Score', 'Votes'],
        results.map((r) => [
          String(r.rank || '-'),
          truncate(String(r.display_name || r.contender_id || '-'), 30),
          String(r.score ?? '-'),
          String(r.vote_count ?? '-'),
        ])
      );
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
    description:
      'Manage battles: create, list, view, open, join, submit, vote, finalize, publish, invite, delete, clone, close, retract, leaderboard.',
  },
  subCommands: {
    create,
    list,
    view,
    open,
    join,
    submit,
    'start-voting': startVoting,
    vote,
    finalize,
    publish: publishBattle,
    invite,
    delete: deleteBattle,
    clone,
    close,
    retract,
    leaderboard,
  },
});
