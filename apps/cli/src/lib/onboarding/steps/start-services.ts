import { execSync } from 'node:child_process'
import type { OnboardingStep } from '../schema'

export const startServicesStep: OnboardingStep = {
  id: 'start_services',
  label: 'Start local services',
  shouldSkip(options) {
    return options.mode !== 'local' || options.skipDb
  },
  async run(options) {
    if (options.dryRun) {
      return {
        id: 'start_services',
        status: 'skipped',
        detail: 'Dry-run: would start Supabase and reset the local database',
      }
    }

    execSync('supabase start', { cwd: process.cwd(), stdio: 'inherit' })
    execSync('supabase db reset', { cwd: process.cwd(), stdio: 'inherit' })

    return {
      id: 'start_services',
      status: 'completed',
      detail: 'Local Supabase started and reset',
    }
  },
}
