import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';

export default defineCommand({
  meta: {
    name: 'publish',
    description: 'Publish a closed battle to make its result page public.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Battle UUID to publish',
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
