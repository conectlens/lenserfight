import { defineCommand } from 'citty'
import devCmd from '../db-commands/dev'
import seedCmd from '../db-commands/seed'
import resetCmd from '../db-commands/reset'

const dev = defineCommand({
  meta: {
    name: 'dev',
    description: 'Start local Supabase stack, run migrations, and seed the database.',
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
  run: (ctx) => (devCmd as any).run(ctx),
})

const seed = defineCommand({
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
  run: (ctx) => (seedCmd as any).run(ctx),
})

const reset = defineCommand({
  meta: {
    name: 'reset',
    description: 'Reset all local settings and the local database. Requires typed confirmation or --force.',
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
  run: (ctx) => (resetCmd as any).run(ctx),
})

export default defineCommand({
  meta: {
    name: 'db',
    description: 'Database management commands.',
  },
  subCommands: {
    dev: dev,
    seed: seed,
    reset: reset,
  },
})
