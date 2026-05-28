import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config/project-config';
import { runCombineSeedsIfPresent } from '../lib/combine-seeds';

export default defineCommand({
  meta: {
    name: 'seed',
    description: 'Run seed.sql against local database. Requires --force to confirm the database reset.',
  },
  args: {
    file: {
      type: 'string',
      description: 'Path to seed SQL file',
      default: 'supabase/seed.sql',
    },
    force: {
      type: 'boolean',
      description: 'Skip confirmation warning and proceed with database reset',
      default: false,
    },
  },
  async run({ args }) {
    const seedPath = resolve(process.cwd(), args.file);

    if (!existsSync(seedPath)) {
      consola.error('Seed file not found: %s', seedPath);
      process.exitCode = 1;
      return;
    }

    const config = loadConfig();

    if (config.mode === 'local') {
      if (!args.force) {
        consola.warn('This will run `supabase db reset`, which DROPS and recreates the local database.');
        consola.warn('All local data will be lost. Re-run with --force to confirm.');
        process.exitCode = 1;
        return;
      }

      consola.info('Seeding local database via `supabase db reset` ...');

      try {
        runCombineSeedsIfPresent(process.cwd());
        execSync('npx supabase db reset', { stdio: 'inherit' });
        consola.success('Seed complete.');
      } catch {
        consola.error('Seed failed. Is the local Supabase stack running? Try `npx supabase start` first.');
        process.exitCode = 1;
      }
    } else {
      consola.error(
        'Cloud seeding is not yet implemented. Use `supabase db push` or run the seed via the Supabase dashboard SQL editor.'
      );
      process.exitCode = 1;
    }
  },
});
