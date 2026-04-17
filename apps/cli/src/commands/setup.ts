import { defineCommand } from 'citty'
import consola from 'consola'
import { execSync, spawn } from 'node:child_process'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  saveConfig,
  configExists,
  LOCAL_SUPABASE_URL,
  LOCAL_ANON_KEY,
} from '../config/project-config'
import { runCombineSeedsIfPresent } from '../lib/combine-seeds'

function checkTool(name: string, versionFlag = '--version'): string | null {
  try {
    return execSync(`${name} ${versionFlag}`, { encoding: 'utf-8' }).trim().split('\n')[0]
  } catch {
    return null
  }
}

function checkDocker(): boolean {
  try {
    execSync('docker info', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Interactive setup wizard for local LenserFight development.',
  },
  args: {
    'skip-db': {
      type: 'boolean',
      description: 'Skip database setup (Supabase start + migration + seed)',
      default: false,
    },
    'skip-open': {
      type: 'boolean',
      description: 'Do not start the web app after setup',
      default: false,
    },
  },
  async run({ args }) {
    consola.box('LenserFight Local Setup')
    const cwd = process.cwd()

    // ── Step 1: Prerequisites ─────────────────────────────────────────────
    consola.start('Checking prerequisites...')

    const nodeVersion = process.version
    const nodeMajor = parseInt(nodeVersion.slice(1).split('.')[0], 10)
    if (nodeMajor < 20) {
      consola.error(`Node.js >= 20 required (found ${nodeVersion}). Install from https://nodejs.org`)
      process.exit(1)
    }
    consola.success(`Node.js ${nodeVersion}`)

    const supabaseVersion = checkTool('supabase', '--version')
    if (!supabaseVersion) {
      consola.error('Supabase CLI not found. Install: npm i -g supabase or brew install supabase/tap/supabase')
      process.exit(1)
    }
    consola.success(`Supabase CLI ${supabaseVersion}`)

    if (!checkDocker()) {
      consola.error('Docker is not running. Start Docker Desktop and try again.')
      process.exit(1)
    }
    consola.success('Docker is running')

    // ── Step 2: Verify schema files ─────────────────────────────────────
    const configToml = resolve(cwd, 'supabase', 'config.toml')
    if (!existsSync(configToml)) {
      consola.error('supabase/config.toml not found. Ensure you cloned the repository correctly.')
      process.exit(1)
    }
    consola.success('Supabase schema ready')

    // ── Step 3: Boot local Supabase ───────────────────────────────────────
    if (!args['skip-db']) {
      consola.start('Starting local Supabase (this may take a minute on first run)...')
      try {
        execSync('supabase start', { cwd, stdio: 'inherit' })
        consola.success('Local Supabase is running')
      } catch {
        consola.warn('supabase start may have already been running. Continuing...')
      }

      // ── Step 4: Run migrations + seeds ──────────────────────────────────
      consola.start('Running migrations and seeding database...')
      try {
        runCombineSeedsIfPresent(cwd)
        execSync('supabase db reset', { cwd, stdio: 'inherit' })
        consola.success('Database migrated and seeded')
      } catch (err) {
        consola.error('Database reset failed. Check the output above for details.')
        process.exit(1)
      }
    } else {
      consola.info('Skipping database setup (--skip-db)')
    }

    // ── Step 5: Create .lenserfight.json ──────────────────────────────────
    if (!configExists(cwd)) {
      saveConfig({ mode: 'local', dbPort: 54322, apiPort: 54321 }, cwd)
      consola.success('Created .lenserfight.json (local mode)')
    } else {
      consola.info('.lenserfight.json already exists, skipping')
    }

    // ── Step 6: Create .env.local ─────────────────────────────────────────
    const envLocalPath = resolve(cwd, '.env.local')
    if (!existsSync(envLocalPath)) {
      const envContent = [
        `VITE_SUPABASE_URL=${LOCAL_SUPABASE_URL}`,
        `VITE_SUPABASE_ANON_KEY=${LOCAL_ANON_KEY}`,
        '',
        '# Local app URLs',
        'VITE_WEB_BASE_URL=http://localhost:3001',
        'VITE_DOCS_BASE_URL=http://localhost:3002',
        'VITE_STATUS_BASE_URL=http://localhost:3003',
        'VITE_API_URL=http://localhost:8786',
        '',
        '# Captcha (test key for local dev)',
        'VITE_CAPTCHA_SITE_KEY=1x00000000000000000000AA',
        '',
      ].join('\n')

      writeFileSync(envLocalPath, envContent, 'utf-8')
      consola.success('Created .env.local with local Supabase configuration')
    } else {
      consola.info('.env.local already exists, skipping')
    }

    // ── Step 7: Open forum app ────────────────────────────────────────────
    consola.box({
      title: 'Setup complete!',
      message: [
        '',
        '  API:    http://127.0.0.1:54321',
        '  DB:     postgresql://postgres:postgres@127.0.0.1:54322/postgres',
        '  Studio: http://127.0.0.1:54323',
        '  Web:    http://localhost:3001',
        '',
        '  Run `npx nx serve web` to start the community app.',
        '  Run `lf doctor` to check your environment.',
        '  Run `lf status` to see your configuration.',
        '',
      ].join('\n'),
    })

    if (!args['skip-open']) {
      consola.start('Starting web app...')
      const child = spawn('npx', ['nx', 'serve', 'web'], {
        cwd,
        stdio: 'inherit',
        shell: true,
        detached: false,
      })
      child.on('error', (err) => {
        consola.error(`Failed to start web app: ${err.message}`)
      })
    }
  },
})
