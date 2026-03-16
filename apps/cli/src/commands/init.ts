import { defineCommand } from 'citty';
import consola from 'consola';
import {
  configExists,
  loadConfig,
  saveConfig,
} from '../config/project-config';

export default defineCommand({
  meta: {
    name: 'init',
    description:
      'Initialize a .lenserfight.json config file for local or cloud mode.',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Environment mode: local or cloud',
      default: 'local',
    },
    url: {
      type: 'string',
      description: 'Supabase URL (defaults to local)',
    },
    'anon-key': {
      type: 'string',
      description: 'Supabase anon key',
    },
  },
  async run({ args }) {
    const mode = args.mode === 'cloud' ? 'cloud' : 'local';

    if (configExists()) {
      const existing = loadConfig();
      consola.warn('.lenserfight.json already exists (mode: %s)', existing.mode);
      consola.info('Overwriting with mode: %s', mode);
    }

    const config = {
      mode: mode as 'local' | 'cloud',
      supabaseUrl:
        args.url || (mode === 'local' ? 'http://127.0.0.1:54321' : ''),
      supabaseAnonKey: args['anon-key'] || '',
      dbPort: 54322,
      apiPort: 54321,
    };

    saveConfig(config);
    consola.success('Created .lenserfight.json (mode: %s)', mode);

    if (mode === 'cloud' && !config.supabaseUrl) {
      consola.warn(
        'Cloud mode selected but no URL set. Run `lenserfight init --mode cloud --url <URL> --anon-key <KEY>`'
      );
    }
  },
});
