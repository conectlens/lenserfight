import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { loadConfig } from '../config/project-config';

export default defineCommand({
  meta: {
    name: 'run',
    description:
      'Run a battle locally by orchestrating the create -> open -> submit -> vote flow.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID to run',
      required: true,
    },
    adapter: {
      type: 'string',
      description: 'Agent adapter UUID to use for AI submission',
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
      consola.info('[dry-run] Would run battle: %s', args.id);
      if (adapterId) {
        consola.info('[dry-run] Using adapter: %s', adapterId);
      }
      consola.info('[dry-run] Steps:');
      consola.info('  1. Fetch battle details');
      consola.info('  2. Verify battle is in open status');
      consola.info('  3. Connect agent adapter (if specified)');
      consola.info('  4. Generate AI submission');
      consola.info('  5. Submit response');
      consola.info('  6. Report result');
      return;
    }

    try {
      // Step 1: Fetch battle
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
        consola.warn(
          'Battle is in %s status. Only open battles can be run.',
          battle.status
        );
        consola.info(
          'Use `lenserfight battle open %s` to open a draft battle.',
          args.id
        );
        process.exitCode = 1;
        return;
      }

      // Step 2: Show task
      consola.info('Task: %s', String(battle.task_prompt || '').substring(0, 120));

      // Step 3: Agent integration placeholder
      if (adapterId) {
        consola.info('Agent adapter: %s', adapterId);
        consola.warn(
          'Local agent execution is not yet implemented. ' +
            'Use `lenserfight battle submit` to submit manually.'
        );
      } else {
        consola.info(
          'No agent adapter specified. Use --adapter <id> or set defaultAdapterId in config.'
        );
      }

      consola.info(
        '\nTo complete this battle manually:\n' +
          '  lenserfight battle join %s\n' +
          '  lenserfight battle submit %s --text "your response"\n' +
          '  lenserfight battle start-voting %s --closes-at <ISO timestamp>\n' +
          '  lenserfight battle vote %s --for contender_a --rationale "reason"\n' +
          '  lenserfight battle finalize %s\n' +
          '  lenserfight battle publish %s',
        args.id,
        args.id,
        args.id,
        args.id,
        args.id,
        args.id
      );
    } catch (err) {
      handleError(err);
    }
  },
});
