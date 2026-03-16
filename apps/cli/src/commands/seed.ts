import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadConfig } from '../config/project-config';

export default defineCommand({
  meta: {
    name: 'seed',
    description: 'Run seed.sql against local or cloud database.',
  },
  args: {
    file: {
      type: 'string',
      description: 'Path to seed SQL file',
      default: 'supabase/seed.sql',
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
      const dbUrl = `postgresql://postgres:postgres@127.0.0.1:${config.dbPort}/postgres`;
      consola.info('Seeding local database from %s ...', args.file);

      try {
        execSync(`psql "${dbUrl}" -f "${seedPath}"`, { stdio: 'inherit' });
        consola.success('Seed complete.');
      } catch {
        consola.error('Seed failed. Is the local database running?');
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
