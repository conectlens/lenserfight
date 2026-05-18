#!/usr/bin/env node

/**
 * LenserFight development entrypoint.
 *
 * First run: prompts for local vs cloud mode, saves choice to .lenserfight.json.
 * Subsequent runs: reads saved config and starts the web app.
 *
 * Usage:
 *   npm run dev          # interactive first-run, then start web app
 *   npm run dev:web      # skip wizard, start web app directly
 *   npm run dev:docs     # start docs dev server
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createInterface } from 'node:readline'
import { spawn, execSync } from 'node:child_process'

const CONFIG_PATH = resolve(process.cwd(), '.lenserfight.json')

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return null
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
  } catch {
    return null
  }
}

function saveConfig(config) {
  const existing = loadConfig() ?? {}
  const merged = { ...existing, ...config }
  writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2) + '\n')
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function checkDocker() {
  try {
    execSync('docker info', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

function startApp() {
  const child = spawn('npx', ['nx', 'serve', 'web'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: true,
  })
  child.on('error', (err) => {
    console.error(`Failed to start web app: ${err.message}`)
    process.exit(1)
  })
  child.on('exit', (code) => process.exit(code ?? 0))
}

async function setupLocal() {
  console.log('\n  Setting up local development...\n')

  if (!checkDocker()) {
    console.error('  Docker is not running. Start Docker Desktop and try again.')
    process.exit(1)
  }

  if (!checkCommand('supabase')) {
    console.error('  Supabase CLI not found. Install: npm i -g supabase')
    process.exit(1)
  }

  saveConfig({ mode: 'local', dbPort: 54322, apiPort: 54321 })

  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) {
    const envContent = [
      'SUPABASE_URL=http://127.0.0.1:54321',
      'SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRFA0NiK7kyqHDkAkEXER0xnuvvidGu0XP2yJZCqMnY',
      '',
      '# Local app URLs (nx serve web uses port 3000 — see apps/web/vite.config.mts)',
      'WEB_BASE_URL=http://localhost:3000',
      'ARENA_URL=http://localhost:3001',
      '# AUTH_BASE_URL=http://localhost:3004',
      'DOCS_BASE_URL=http://localhost:3002',
      'STATUS_BASE_URL=http://localhost:3003',
      'API_URL=http://localhost:8786',
      '',
      '# Captcha (test key for local dev)',
      'CAPTCHA_SITE_KEY=1x00000000000000000000AA',
      '',
    ].join('\n')
    writeFileSync(envPath, envContent, 'utf-8')
    console.log('  Created .env.local with local Supabase config')
  }

  console.log('  Starting local Supabase...')
  try {
    execSync('supabase start', { cwd: process.cwd(), stdio: 'inherit' })
  } catch {
    console.log('  Supabase may already be running. Continuing...')
  }

  console.log('')
  console.log('  ── Local database ─────────────────────────────────────────────')
  console.log('  First time (or after seed changes):')
  console.log('    pnpm supabase:combine-seeds && pnpm supabase:db:reset')
  console.log('  (db reset reapplies migrations + seed.sql; can take several minutes.)')
  console.log('  ──────────────────────────────────────────────────────────────')
  console.log('')
  startApp()
}

async function setupCloud() {
  saveConfig({
    mode: 'cloud',
    cloudApiUrl: 'https://api.lenserfight.com',
  })

  const envPath = resolve(process.cwd(), '.env.local')
  if (!existsSync(envPath)) {
    const envContent = [
      '# LenserFight Cloud mode',
      '# Run `lf connect` to link your project to LenserFight Cloud',
      '',
      '# These will be populated by `lf connect`:',
      '# SUPABASE_URL=https://<project>.supabase.co',
      '# SUPABASE_ANON_KEY=<your-anon-key>',
      '',
      'API_URL=https://api.lenserfight.com',
      'WEB_BASE_URL=http://localhost:3000',
      '# AUTH_BASE_URL=…',
      '# ARENA_URL=http://localhost:3001',
      '',
    ].join('\n')
    writeFileSync(envPath, envContent, 'utf-8')
    console.log('  Created .env.local for cloud mode')
    console.log('  Run `lf connect` to complete cloud setup\n')
  }

  startApp()
}

async function main() {
  const config = loadConfig()

  if (config?.mode) {
    // Config exists — skip wizard, start app
    console.log(`\n  LenserFight (${config.mode} mode)\n`)
    if (config.mode === 'local') {
      // Check if Supabase is running
      try {
        execSync('supabase status', { stdio: 'pipe' })
      } catch {
        console.log('  Starting local Supabase...')
        try {
          execSync('supabase start', { cwd: process.cwd(), stdio: 'inherit' })
        } catch {
          // ignore
        }
      }
    }
    startApp()
    return
  }

  // First run — prompt for mode
  console.log('')
  console.log('  Welcome to LenserFight!')
  console.log('')
  console.log('  Choose your development mode:')
  console.log('    1) Local  — full offline dev (requires Docker + Supabase CLI)')
  console.log('    2) Cloud  — connect to LenserFight Cloud (no local DB needed)')
  console.log('')

  const choice = await ask('  Enter 1 or 2: ')

  if (choice === '1' || choice.toLowerCase().startsWith('l')) {
    await setupLocal()
  } else if (choice === '2' || choice.toLowerCase().startsWith('c')) {
    await setupCloud()
  } else {
    console.log('  Invalid choice. Defaulting to local mode.')
    await setupLocal()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
