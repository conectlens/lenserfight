import { defineCommand } from 'citty'
import {
  configExists,
  getOnboardingState,
  loadConfig,
  resolveConfig,
} from '../config/project-config'
import { isAuthenticated } from '../utils/auth'
import { printInfo, printJson, printWarn } from '../utils/output'

export default defineCommand({
  meta: {
    name: 'status',
    description: 'Show effective config, auth, and onboarding status.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Emit structured JSON',
      default: false,
    },
  },
  async run({ args }) {
    const config = resolveConfig()
    const onboarding = getOnboardingState()
    const project = configExists() ? loadConfig() : null

    const payload = {
      projectConfigPresent: !!project,
      mode: project?.mode ?? config.mode,
      supabaseUrl: config.supabaseUrl || null,
      cloudApiUrl: config.cloudApiUrl || null,
      supabaseAnonKeyPresent: !!config.supabaseAnonKey,
      serviceRoleKeyPresent: !!config.supabaseServiceRoleKey,
      authStatus: isAuthenticated() ? 'authenticated' : 'not_authenticated',
      developerTokenStatus: config.developerToken
        ? config.developerTokenExpiresAt
          ? `set (expires ${config.developerTokenExpiresAt})`
          : 'set'
        : 'not_set',
      onboarding,
      defaultStorageAdapter: config.defaultStorageAdapter ?? null,
      ollamaBaseUrl: config.ollamaBaseUrl ?? null,
    }

    if (args.json) {
      printJson(payload)
      return
    }

    if (!project) {
      printWarn('Project config missing. Run `lf setup` or `lf init`.')
    }

    printInfo('Mode: %s', payload.mode)
    printInfo('Supabase URL: %s', payload.supabaseUrl ?? '(not set)')
    printInfo('Cloud API: %s', payload.cloudApiUrl ?? '(not set)')
    printInfo('Anon key: %s', payload.supabaseAnonKeyPresent ? 'set' : 'not set')
    printInfo('Service role key: %s', payload.serviceRoleKeyPresent ? 'set' : 'not set')
    printInfo('Auth: %s', payload.authStatus)
    printInfo('Developer token: %s', payload.developerTokenStatus)
    printInfo('Default storage adapter: %s', payload.defaultStorageAdapter ?? '(not set)')
    printInfo('Ollama base URL: %s', payload.ollamaBaseUrl ?? '(default)')
    if (onboarding) {
      printInfo('Onboarding: %s (%s)', onboarding.status, onboarding.updatedAt)
    }
  },
})
