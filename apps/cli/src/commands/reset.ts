import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { findConfigPath, getDeviceConfigPath } from '../config/project-config';
import { runCombineSeedsIfPresent } from '../lib/combine-seeds';
import { assertSafe } from '../lib/safety';

const USER_CONFIG_PATH = getDeviceConfigPath();

export default defineCommand({
  meta: {
    name: 'reset',
    description:
      'Reset all local settings and the local database. Requires typed confirmation or --force.',
  },
  args: {
    force: {
      type: 'boolean',
      description: 'Skip interactive confirmation (required in CI / non-interactive shells)',
      default: false,
    },
    'skip-db': {
      type: 'boolean',
      description: 'Skip database reset, only clear config files',
      default: false,
    },
  },
  async run({ args }) {
    await assertSafe({
      risk: 'CRITICAL',
      reversibility: 'IRREVERSIBLE',
      confirmationPolicy: 'TYPED',
      typedPhrase: 'RESET',
      forceFlag: '--force',
      hasForce: args.force,
      description: 'Full reset of project config, auth credentials, and local database.',
      affectedResources: [
        { type: 'config', name: '.lenserfight.json', scope: 'local' },
        { type: 'config', name: 'device config (auth tokens + keys)', scope: 'local' },
        ...(!args['skip-db']
          ? [{ type: 'database', name: 'local Supabase database (supabase db reset)', scope: 'local' as const }]
          : []),
      ],
      rollbackAvailable: false,
      dryRunSupported: false,
      notes: [
        'All local data, auth tokens, and API keys stored on this machine will be lost.',
        'Re-initialize with: lf init',
      ],
    });

    let failed = false;

    const projectConfigPath = findConfigPath();
    if (existsSync(projectConfigPath)) {
      rmSync(projectConfigPath);
      consola.success('Removed %s', projectConfigPath);
    } else {
      consola.info('No project config found, skipping.');
    }

    if (existsSync(USER_CONFIG_PATH)) {
      rmSync(USER_CONFIG_PATH);
      consola.success('Removed %s', USER_CONFIG_PATH);
    } else {
      consola.info('No user config found, skipping.');
    }

    if (!args['skip-db']) {
      consola.info('Resetting local database via `supabase db reset` ...');
      try {
        const projectRoot = resolve(findConfigPath(), '..');
        runCombineSeedsIfPresent(projectRoot);
        execSync('npx supabase db reset', { stdio: 'inherit', cwd: projectRoot });
        consola.success('Database reset complete.');
      } catch {
        consola.error(
          'Database reset failed. Is the local Supabase stack running? Try `npx supabase start` first.'
        );
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
