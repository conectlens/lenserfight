import { defineCommand } from 'citty';
import consola from 'consola';
import { execSync, spawn } from 'node:child_process';
import { runCombineSeedsIfPresent } from '../lib/combine-seeds';

export default defineCommand({
  meta: {
    name: 'dev',
    description:
      'Start local Supabase stack, run migrations, and seed the database.',
  },
  args: {
    reset: {
      type: 'boolean',
      description: 'Run db reset instead of start (drops and recreates)',
      default: false,
    },
    echo: {
      type: 'boolean',
      description: 'Set USE_ECHO_PROVIDER=true — no real API calls (local testing)',
      default: false,
    },
  },
  async run({ args }) {
    if (args.echo) {
      process.env['USE_ECHO_PROVIDER'] = 'true'
      consola.warn(
        '[ECHO MODE] USE_ECHO_PROVIDER=true — all generative nodes will mirror their prompt as output. No real API calls will be made.',
      )
    }

    if (args.reset) {
      consola.info('Resetting local database (drop + recreate + migrate + seed)...');
      try {
        runCombineSeedsIfPresent(process.cwd());
        execSync('supabase db reset', { stdio: 'inherit' });
        consola.success('Database reset complete.');
      } catch {
        consola.error('Database reset failed. Check output above.');
        process.exitCode = 1;
      }
      return;
    }

    consola.info('Starting local Supabase stack...');
    const child = spawn('supabase', ['start'], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        consola.success('Local Supabase is running.');
        consola.info('  API:    http://127.0.0.1:54321');
        consola.info('  DB:     postgresql://postgres:postgres@127.0.0.1:54322/postgres');
        consola.info('  Studio: http://127.0.0.1:54323');
      } else {
        consola.error('Supabase start exited with code %d', code);
        process.exitCode = 1;
      }
    });
  },
});
