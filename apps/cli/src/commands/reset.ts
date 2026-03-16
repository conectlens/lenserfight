import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { findConfigPath } from '../config/project-config';

const USER_CONFIG_PATH = resolve(homedir(), '.lenserfight', 'config.json');

export default defineCommand({
  meta: {
    name: 'reset',
    description:
      'Reset all local settings and the local database. Requires --force to confirm.',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Skip confirmation warning and proceed with full reset',
      default: false,
    },
    'skip-db': {
      type: 'boolean',
      description: 'Skip database reset, only clear config files',
      default: false,
    },
  },
  async run({ args }) {
    if (!args.force) {
      consola.warn('⚠  This will perform a FULL RESET:');
      consola.warn('   • Delete .lenserfight.json (project config)');
      consola.warn('   • Delete ~/.lenserfight/config.json (auth tokens + keys)');
      consola.warn('   • Run `supabase db reset` (drops and recreates local database)');
      consola.warn('');
      consola.warn('All local data and credentials will be lost.');
      consola.warn('Re-run with --force to confirm.');
      process.exitCode = 1;
      return;
    }

    let failed = false;

    // 1. Remove project config
    const projectConfigPath = findConfigPath();
    if (existsSync(projectConfigPath)) {
      rmSync(projectConfigPath);
      consola.success('Removed %s', projectConfigPath);
    } else {
      consola.info('No project config found, skipping.');
    }

    // 2. Remove user config
    if (existsSync(USER_CONFIG_PATH)) {
      rmSync(USER_CONFIG_PATH);
      consola.success('Removed %s', USER_CONFIG_PATH);
    } else {
      consola.info('No user config found, skipping.');
    }

    // 3. Reset local database
    if (!args['skip-db']) {
      consola.info('Resetting local database via `supabase db reset` ...');
      try {
        execSync('npx supabase db reset', { stdio: 'inherit' });
        consola.success('Database reset complete.');
      } catch {
        consola.error('Database reset failed. Is the local Supabase stack running? Try `npx supabase start` first.');
        failed = true;
      }
    } else {
      consola.info('Skipping database reset (--skip-db).');
    }

    if (failed) {
      process.exitCode = 1;
    } else {
      consola.success('Reset complete. Run `lenserfight init` to reinitialize.');
    }
  },
});
