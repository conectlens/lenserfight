import { defineCommand } from 'citty'
import consola from 'consola'
import { spawn } from 'node:child_process'
import {
  loadOnboardingSnapshot,
  markOnboardingComplete,
  markOnboardingFailed,
  markOnboardingStarted,
  markOnboardingStep,
} from '../lib/onboarding/state'
import type { OnboardingStep, SetupOptions } from '../lib/onboarding/schema'
import { detectPrerequisitesStep } from '../lib/onboarding/steps/prerequisites'
import { verifyWorkspaceStep } from '../lib/onboarding/steps/verify-workspace'
import { configureProjectStep } from '../lib/onboarding/steps/configure-project'
import { startServicesStep } from '../lib/onboarding/steps/start-services'
import { handoffStep } from '../lib/onboarding/steps/handoff'
import {
  JOURNEY_STEPS,
  fetchJourneyState,
  countCompleted,
  nextRequiredStep,
  type JourneyState,
} from '../lib/onboarding/journey'
import { isAuthenticated } from '../utils/auth'
import { resolveConfig, configExists } from '../config/project-config'
import { printInfo, printJson, printSuccess, printWarn, printError } from '../utils/output'
import { A, c, sym } from '../utils/ansi'

// ── MESSAGES ─────────────────────────────────────────────────────────────────

const M = {
  notAuthenticated: 'Not authenticated. Run `lf auth login` first.',
  journeyUnavailable:
    'Journey state unavailable (API unreachable or RPC not yet deployed). ' +
    'Complete steps at https://lenserfight.com/getting-started',
  journeyHeader: 'LenserFight Developer Onboarding',
  interactivePrompt: 'What do you want to do next?',
  openingBrowser: (url: string) => `Opening ${url} in your browser...`,
  orRun: (cmd: string) => `Or run: ${cmd}`,
  skipLabel: 'Skip — show me the checklist',
  setupComplete: 'All required onboarding steps are complete.',
  progressLine: (done: number, total: number) => `Progress: ${done} / ${total} steps done`,
  hints: [
    'Run `lf setup --interactive` to be guided step by step.',
    'Run `lf status` to see this again.',
    'Run `lf doctor` to check your environment.',
  ],
} as const

// ── ENV SETUP (local / cloud) ─────────────────────────────────────────────────

const ENV_STEPS: OnboardingStep[] = [
  detectPrerequisitesStep,
  verifyWorkspaceStep,
  configureProjectStep,
  startServicesStep,
  handoffStep,
]

function resolveSetupOptions(args: Record<string, unknown>): SetupOptions {
  return {
    mode: args.mode === 'cloud' ? 'cloud' : 'local',
    dryRun: Boolean(args['dry-run']),
    nonInteractive: Boolean(args['non-interactive']),
    resume: Boolean(args.resume),
    skipDb: Boolean(args['skip-db']),
    skipAuth: Boolean(args['skip-auth']),
    skipOpen: Boolean(args['skip-open']),
    ollama: Boolean(args.ollama),
    ollamaBaseUrl: typeof args['ollama-base-url'] === 'string' ? args['ollama-base-url'] : undefined,
    json: Boolean(args.json),
    verbose: Boolean(args.verbose),
  }
}

async function runEnvSetup(options: SetupOptions): Promise<void> {
  const previous = loadOnboardingSnapshot()
  const results: Array<{ step: string; status: string; detail: string }> = []

  if (!options.json) {
    printInfo('Starting environment setup in %s mode', options.mode)
    if (options.resume && previous) {
      printInfo('Resuming from onboarding state updated at %s', previous.updatedAt)
    }
  }

  markOnboardingStarted(options.mode)

  try {
    for (const step of ENV_STEPS) {
      if (options.resume && previous?.completedSteps.includes(step.id)) {
        results.push({ step: step.id, status: 'skipped', detail: 'Already completed in prior run' })
        continue
      }
      if (step.shouldSkip?.(options)) {
        markOnboardingStep(step.id, 'skipped')
        results.push({ step: step.id, status: 'skipped', detail: 'Skipped by options' })
        continue
      }
      const result = await step.run(options)
      markOnboardingStep(step.id, result.status)
      results.push({ step: result.id, status: result.status, detail: result.detail })
    }

    markOnboardingComplete(options.mode)

    if (!options.skipOpen && !options.dryRun && options.mode === 'local') {
      spawn('pnpm', ['nx', 'run', 'web:serve'], {
        cwd: process.cwd(),
        stdio: 'inherit',
        shell: true,
        detached: false,
      })
    }

    if (options.json) {
      printJson({ mode: options.mode, status: 'complete', results })
      return
    }

    for (const result of results) {
      if (result.status === 'completed') printSuccess('%s: %s', result.step, result.detail)
      else printWarn('%s: %s', result.step, result.detail)
    }
    printSuccess('Environment setup complete.')
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    markOnboardingFailed(message)

    if (options.json) {
      printJson({ mode: options.mode, status: 'partial', error: message, results })
      process.exitCode = 1
      return
    }

    printWarn('Setup stopped: %s', message)
    process.exitCode = 1
  }
}

// ── JOURNEY MODE ──────────────────────────────────────────────────────────────

function renderJourneyChecklist(state: JourneyState, handle: string | null): void {
  const { done, total } = countCompleted(state)
  const sep = `${A.gray}${'─'.repeat(48)}${A.reset}`

  console.log('')
  console.log(`  ${c.brand(M.journeyHeader)}`)
  console.log(`  ${sep}`)
  if (handle) {
    console.log(`  Lenser: ${c.accent('@' + handle)} ${c.success('(authenticated ' + sym.pass + ')')}`)
    console.log('')
  }

  const required = JOURNEY_STEPS.filter((s) => s.required)
  const optional = JOURNEY_STEPS.filter((s) => !s.required)

  console.log(`  ${c.bold('Required')}`)
  for (const step of required) {
    const isDone = state[step.id]
    const icon = isDone ? c.success(`[${sym.pass}]`) : c.muted('[ ]')
    const label = isDone ? c.muted(step.label) : step.label
    console.log(`    ${icon} ${label}`)
    if (!isDone) {
      console.log(`         ${c.muted(sym.arrow + ' run:')} ${c.accent(step.command)}`)
    }
  }

  console.log('')
  console.log(`  ${c.bold('Recommended')}`)
  for (const step of optional) {
    const isDone = state[step.id]
    const icon = isDone ? c.success(`[${sym.pass}]`) : c.muted('[ ]')
    const label = isDone ? c.muted(step.label) : step.label
    console.log(`    ${icon} ${label}`)
    if (!isDone) {
      console.log(`         ${c.muted(sym.arrow + ' run:')} ${c.accent(step.command)}`)
    }
  }

  console.log('')
  console.log(`  ${sep}`)
  console.log(`  ${M.progressLine(done, total)}`)
  console.log('')

  const next = nextRequiredStep(state)
  if (next) {
    console.log(`  ${c.bold('Next step:')} ${next.label}`)
    console.log(`    ${c.accent(next.command)}`)
    console.log('')
  } else {
    console.log(`  ${c.success(M.setupComplete)}`)
    console.log('')
  }

  for (const hint of M.hints) {
    console.log(`  ${c.muted(hint)}`)
  }
  console.log('')
}

async function runJourneyInteractive(state: JourneyState): Promise<void> {
  const pending = JOURNEY_STEPS.filter((s) => !state[s.id])
  if (pending.length === 0) {
    console.log(c.success(M.setupComplete))
    return
  }

  const selected = await consola.prompt(M.interactivePrompt, {
    type: 'select',
    options: [
      ...pending.map((s) => ({ label: s.label, value: s.id })),
      { label: M.skipLabel, value: '__skip__' },
    ],
  })

  if (selected === '__skip__') return

  const step = JOURNEY_STEPS.find((s) => s.id === selected)
  if (!step) return

  const config = resolveConfig()
  const webBase = config.cloudApiUrl
    ? config.cloudApiUrl.replace('/rest/v1', '').replace('/api', '')
    : 'https://lenserfight.com'
  const webUrl = `${webBase}${step.webPath}`

  console.log('')
  console.log(`  ${M.openingBrowser(webUrl)}`)
  console.log(`  ${M.orRun(step.command)}`)
  console.log('')

  const { openBrowser } = await import('../utils/auth')
  openBrowser(webUrl)
}

async function runJourneySetup(interactive: boolean, json: boolean): Promise<void> {
  if (!isAuthenticated()) {
    if (json) {
      printJson({ status: 'unauthenticated', error: M.notAuthenticated })
      process.exitCode = 1
    } else {
      printError(M.notAuthenticated)
    }
    return
  }

  const state = await fetchJourneyState()

  if (!state) {
    if (json) {
      printJson({ status: 'unavailable', error: M.journeyUnavailable })
    } else {
      printWarn(M.journeyUnavailable)
    }
    return
  }

  if (json) {
    const { done, total } = countCompleted(state)
    printJson({ status: 'ok', progress: { done, total }, journey: state })
    return
  }

  const { loadUserConfig } = await import('../config/project-config')
  const userCfg = loadUserConfig() as Record<string, unknown>
  const handle = typeof userCfg['handle'] === 'string' ? userCfg['handle'] : null

  renderJourneyChecklist(state, handle)

  if (interactive) {
    await runJourneyInteractive(state)
  }
}

// ── COMMAND ────────────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'setup',
    description:
      'Onboarding wizard. Defaults to journey mode (product checklist) when authenticated; use --mode local|cloud for environment setup.',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Setup mode: journey (default when authenticated), local, or cloud',
      default: '',
    },
    interactive: {
      type: 'boolean',
      description: 'Guided step-by-step journey prompt (journey mode only)',
      default: false,
    },
    'dry-run': {
      type: 'boolean',
      description: 'Preview actions without mutating the workspace (env modes only)',
      default: false,
    },
    'non-interactive': {
      type: 'boolean',
      description: 'Disable prompts (env modes only)',
      default: false,
    },
    resume: {
      type: 'boolean',
      description: 'Resume from previous onboarding state (env modes only)',
      default: false,
    },
    'skip-db': {
      type: 'boolean',
      description: 'Skip database startup (env modes only)',
      default: false,
    },
    'skip-auth': {
      type: 'boolean',
      description: 'Skip auth guidance during handoff (env modes only)',
      default: false,
    },
    'skip-open': {
      type: 'boolean',
      description: 'Do not open the web app after env setup',
      default: false,
    },
    ollama: {
      type: 'boolean',
      description: 'Require a reachable Ollama endpoint during env setup',
      default: false,
    },
    'ollama-base-url': {
      type: 'string',
      description: 'Override the Ollama base URL',
    },
    json: {
      type: 'boolean',
      description: 'Emit JSON output',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Print additional detail',
      default: false,
    },
  },
  async run({ args }) {
    const rawMode = typeof args.mode === 'string' ? args.mode : ''

    if (rawMode === 'local' || rawMode === 'cloud') {
      return runEnvSetup(resolveSetupOptions(args as Record<string, unknown>))
    }

    // journey or auto
    if (rawMode === 'journey' || rawMode === '') {
      // Fresh-clone fallback: no config, no auth → run env setup
      if (rawMode === '' && !configExists() && !isAuthenticated()) {
        printInfo('No project config found. Running environment setup (--mode local).')
        return runEnvSetup(resolveSetupOptions({ ...args, mode: 'local' } as Record<string, unknown>))
      }
      return runJourneySetup(Boolean(args.interactive), Boolean(args.json))
    }

    printError('Unknown mode "%s". Use: journey, local, or cloud.', rawMode)
    process.exitCode = 1
  },
})
