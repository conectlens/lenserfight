import { defineCommand } from 'citty';
import consola from 'consola';
import {
  configExists,
  ensureUserConfigDir,
  getDeviceConfigPath,
  loadConfig,
  loadEnvConfig,
  saveConfig,
} from '../config/project-config';

// Well-known local Supabase URL (same for every project)
const LOCAL_DEFAULT_URL = 'http://127.0.0.1:54321';

export default defineCommand({
  meta: {
    name: 'init',
    description:
      'Initialize .lenserfight/lenserfight.json. Keys are never stored here — use env vars or the device config (run `lf doctor` to see the path).',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Environment mode: local or cloud',
      default: 'cloud',
    },
    url: {
      type: 'string',
      description: 'Supabase URL (optional — auto-detected for local mode)',
    },
    source: {
      type: 'string',
      description: 'Key source hint: auto (default), env, supabase',
      default: 'auto',
    },
  },
  async run({ args }) {
    const mode = args.mode === 'local' ? 'local' : 'cloud';

    if (configExists()) {
      const existing = loadConfig();
      consola.warn('.lenserfight/lenserfight.json already exists (mode: %s)', existing.mode);
      consola.info('Overwriting with mode: %s', mode);
    }

    const supabaseUrl = args.url || (mode === 'local' ? LOCAL_DEFAULT_URL : '');

    saveConfig({ mode: mode as 'local' | 'cloud', supabaseUrl, dbPort: 54322, apiPort: 54321 });
    const userConfigCreated = ensureUserConfigDir();
    consola.success('Created .lenserfight/lenserfight.json (mode: %s)', mode);
    if (userConfigCreated) {
      consola.success('Created %s (tokens stored here after login)', getDeviceConfigPath());
    } else {
      consola.info('%s already exists', getDeviceConfigPath());
    }

    // Show resolution summary
    const env = loadEnvConfig();
    const source = args.source;

    if (mode === 'local') {
      if (env.supabaseAnonKey) {
        consola.info('Anon key : from %s', env.supabaseAnonKey ? '.env/.env.local' : 'local Supabase defaults');
      } else {
        consola.info('Anon key : local Supabase defaults (auto)');
      }
      consola.info('URL      : %s', supabaseUrl);
    } else {
      // Cloud mode guidance
      if (env.supabaseAnonKey) {
        consola.info('Anon key : detected in .env/.env.local');
      } else {
        consola.warn('Anon key : not found. Set SUPABASE_ANON_KEY in .env.local or your shell environment.');
      }
      if (supabaseUrl) {
        consola.info('URL      : %s', supabaseUrl);
      } else {
        consola.warn('URL      : not set. Pass --url or set SUPABASE_URL in your environment.');
      }

      if (source === 'env') {
        consola.info('Keys are resolved from environment variables — nothing secret is written to .lenserfight/lenserfight.json.');
      }
    }
  },
});
