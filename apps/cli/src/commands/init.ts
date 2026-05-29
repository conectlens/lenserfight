import { defineCommand } from 'citty';
import consola from 'consola';
import {
  configExists,
  ensureUserConfigDir,
  getDeviceConfigPath,
  getUserPreferencesPath,
  loadConfig,
  loadEnvConfig,
  projectConfigExists,
  saveConfig,
  saveUserPreferences,
  userPreferencesExist,
} from '../config/project-config';

// Well-known local Supabase URL (same for every project)
const LOCAL_DEFAULT_URL = 'http://127.0.0.1:54321';

export default defineCommand({
  meta: {
    name: 'init',
    description:
      'Initialize CLI preferences under your OS config directory (e.g. ~/.config/lenserfight/lenserfight.json). Use --project to write a repo-local .lenserfight/ instead.',
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
    project: {
      type: 'boolean',
      description: 'Write .lenserfight/lenserfight.json in the current directory (for shared team defaults)',
      default: false,
    },
  },
  async run({ args }) {
    const mode = args.mode === 'local' ? 'local' : 'cloud';
    const prefs = {
      mode: mode as 'local' | 'cloud',
      supabaseUrl: args.url || (mode === 'local' ? LOCAL_DEFAULT_URL : ''),
      dbPort: 54322,
      apiPort: 54321,
    };

    if (args.project) {
      if (configExists()) {
        const existing = loadConfig();
        consola.warn('.lenserfight/lenserfight.json already exists (mode: %s)', existing.mode);
        consola.info('Overwriting with mode: %s', mode);
      }
      saveConfig(prefs);
      consola.success('Created project config: .lenserfight/lenserfight.json (mode: %s)', mode);
    } else {
      if (userPreferencesExist()) {
        const existing = loadConfig();
        consola.warn('User config already exists (mode: %s)', existing.mode);
        consola.info('Overwriting with mode: %s', mode);
      }
      saveUserPreferences(prefs);
      consola.success('Created user config: %s (mode: %s)', getUserPreferencesPath(), mode);
    }

    const userConfigCreated = ensureUserConfigDir();
    if (userConfigCreated) {
      consola.success('Created %s (tokens stored here after login)', getDeviceConfigPath());
    } else {
      consola.info('%s already exists', getDeviceConfigPath());
    }

    if (projectConfigExists() && !args.project) {
      consola.info(
        'This directory also has a project config; project settings override your user defaults when you run commands here.',
      );
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
      consola.info('URL      : %s', prefs.supabaseUrl);
    } else {
      // Cloud mode guidance
      if (env.supabaseAnonKey) {
        consola.info('Anon key : detected in .env/.env.local');
      } else {
        consola.warn('Anon key : not found. Set SUPABASE_ANON_KEY in .env.local or your shell environment.');
      }
      if (prefs.supabaseUrl) {
        consola.info('URL      : %s', prefs.supabaseUrl);
      } else {
        consola.warn('URL      : not set. Pass --url or set SUPABASE_URL in your environment.');
      }

      if (source === 'env') {
        consola.info(
          'Keys are resolved from environment variables — nothing secret is written to lenserfight.json.',
        );
      }
    }
  },
});
