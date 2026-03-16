import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { resolveConfig as loadConfig } from '../config/project-config';

// ---------------------------------------------------------------------------
// run submit
// ---------------------------------------------------------------------------
const submit = defineCommand({
  meta: {
    name: 'submit',
    description: 'Run only the submission step for a battle.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would submit to battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      return;
    }

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

      if (battle.status !== 'open') {
        consola.warn('Battle is in %s status. Only open battles accept submissions.', battle.status);
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);
      consola.info('Task:   %s', String(battle.task_prompt || '').substring(0, 120));

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Local agent execution is not yet implemented. Use `lenserfight battle submit` to submit manually.');
      } else {
        consola.info('No agent adapter specified. Use --adapter <id> or set defaultAdapterId in config.');
        consola.info('To submit manually: lenserfight battle submit %s --text "your response"', args.id);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run vote
// ---------------------------------------------------------------------------
const vote = defineCommand({
  meta: {
    name: 'vote',
    description: 'Run only the voting step using a specified adapter.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use for voting',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would run voting step for battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      return;
    }

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

      if (battle.status !== 'voting') {
        consola.warn('Battle is in %s status. Voting step requires voting status.', battle.status);
        consola.info('Use `lenserfight battle start-voting %s --closes-at <ISO timestamp>` first.', args.id);
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Automated voting via adapter is not yet implemented. Use `lenserfight battle vote` to vote manually.');
      } else {
        consola.info('To vote manually: lenserfight battle vote %s --for contender_a --rationale "reason"', args.id);
      }
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run full
// ---------------------------------------------------------------------------
const full = defineCommand({
  meta: {
    name: 'full',
    description: 'Run the full create → open → submit → vote → finalize flow.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID to run end-to-end',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    const config = loadConfig();
    const adapterId = args.adapter || config.defaultAdapterId;

    if (args['dry-run']) {
      consola.info('[dry-run] Would run full flow for battle: %s', args.id);
      if (adapterId) consola.info('[dry-run] Using adapter: %s', adapterId);
      consola.info('[dry-run] Steps: fetch → verify open → submit → start-voting → vote → finalize');
      return;
    }

    try {
      consola.start('Fetching battle %s...', args.id);
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      consola.info('Battle: %s [%s]', battle.title, battle.status);

      if (battle.status !== 'open') {
        consola.warn('Battle is in %s status. Only open battles can be run.', battle.status);
        consola.info('Use `lenserfight battle open %s` to open a draft battle.', args.id);
        process.exitCode = 1;
        return;
      }

      consola.info('Task: %s', String(battle.task_prompt || '').substring(0, 120));

      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn('Full automated flow is not yet implemented.');
      } else {
        consola.info('No agent adapter specified. Use --adapter <id> or set defaultAdapterId in config.');
      }

      consola.info(
        '\nTo complete this battle manually:\n' +
          '  lenserfight battle submit %s --text "your response"\n' +
          '  lenserfight battle start-voting %s --closes-at <ISO timestamp>\n' +
          '  lenserfight battle vote %s --for contender_a --rationale "reason"\n' +
          '  lenserfight battle finalize %s\n' +
          '  lenserfight battle publish %s',
        args.id, args.id, args.id, args.id, args.id
      );
    } catch (err) {
      handleError(err);
    }
  },
});

// ---------------------------------------------------------------------------
// run replay
// ---------------------------------------------------------------------------
const replay = defineCommand({
  meta: {
    name: 'replay',
    description: 'Re-run a completed battle with a different adapter for comparison.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Source battle UUID to replay',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use for the replay',
      required: true,
    },
    slug: {
      type: 'string',
      description: 'Slug for the replayed battle',
      required: true,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Show what would happen without executing',
      default: false,
    },
  },
  async run({ args }) {
    if (args['dry-run']) {
      consola.info('[dry-run] Would clone battle %s and re-run with adapter %s', args.id, args.adapter);
      return;
    }

    try {
      const battle = await callRpc<Record<string, unknown>>(
        'fn_battles_get_public',
        { p_battle_id: args.id }
      );

      if (!battle) {
        consola.error('Source battle not found or not public.');
        process.exitCode = 1;
        return;
      }

      consola.info('Source battle: %s [%s]', battle.title, battle.status);
      consola.info('Adapter:       %s', args.adapter);
      consola.warn('Automated replay is not yet implemented.');
      consola.info(
        'To replay manually:\n' +
          '  lenserfight battle clone %s --title "%s (replay)" --slug %s\n' +
          '  Then run the new battle with: lenserfight run full <new-id> --adapter %s',
        args.id, String(battle.title || 'Battle'), args.slug, args.adapter
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
    name: 'run',
    description: 'Orchestrate battle execution: submit, vote, full, replay.',
  },
  subCommands: {
    submit,
    vote,
    full,
    replay,
  },
});
