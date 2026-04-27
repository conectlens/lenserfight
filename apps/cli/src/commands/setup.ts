import { defineCommand } from 'citty'
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
import { printInfo, printJson, printSuccess, printWarn } from '../utils/output'

const STEPS: OnboardingStep[] = [
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

export default defineCommand({
  meta: {
    name: 'setup',
    description: 'Deterministic onboarding wizard for local and cloud LenserFight environments.',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Setup mode: local or cloud',
      default: 'local',
    },
    'dry-run': {
      type: 'boolean',
      description: 'Preview actions without mutating the workspace',
      default: false,
    },
    'non-interactive': {
      type: 'boolean',
      description: 'Disable prompts and rely on flags/env/config only',
      default: false,
    },
    resume: {
      type: 'boolean',
      description: 'Resume from the previous onboarding state',
      default: false,
    },
    'skip-db': {
      type: 'boolean',
      description: 'Skip starting and resetting the local database',
      default: false,
    },
    'skip-auth': {
      type: 'boolean',
      description: 'Skip any auth guidance during handoff',
      default: false,
    },
    'skip-open': {
      type: 'boolean',
      description: 'Do not launch the web app after setup',
      default: false,
    },
    ollama: {
      type: 'boolean',
      description: 'Require a reachable Ollama endpoint during setup',
      default: false,
    },
    'ollama-base-url': {
      type: 'string',
      description: 'Override the Ollama base URL used during checks and .env generation',
    },
    json: {
      type: 'boolean',
      description: 'Emit a JSON summary instead of human logs',
      default: false,
    },
    verbose: {
      type: 'boolean',
      description: 'Print additional setup detail',
      default: false,
    },
  },
  async run({ args }) {
    const options = resolveSetupOptions(args as Record<string, unknown>)
    const previous = loadOnboardingSnapshot()
    const results: Array<{ step: string; status: string; detail: string }> = []

    if (!options.json) {
      printInfo('Starting onboarding in %s mode', options.mode)
      if (options.resume && previous) {
        printInfo('Resuming from onboarding state updated at %s', previous.updatedAt)
      }
    }

    markOnboardingStarted(options.mode)

    try {
      for (const step of STEPS) {
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
        printJson({
          mode: options.mode,
          status: 'complete',
          results,
        })
        return
      }

      for (const result of results) {
        if (result.status === 'completed') printSuccess('%s: %s', result.step, result.detail)
        else printWarn('%s: %s', result.step, result.detail)
      }
      printSuccess('Onboarding complete.')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      markOnboardingFailed(message)

      if (options.json) {
        printJson({
          mode: options.mode,
          status: 'partial',
          error: message,
          results,
        })
        process.exitCode = 1
        return
      }

      printWarn('Onboarding stopped: %s', message)
      process.exitCode = 1
    }
  },
})
