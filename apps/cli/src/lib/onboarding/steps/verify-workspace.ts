import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { OnboardingStep } from '../schema'

export const verifyWorkspaceStep: OnboardingStep = {
  id: 'verify_workspace',
  label: 'Verify workspace',
  async run() {
    const configToml = resolve(process.cwd(), 'supabase', 'config.toml')
    if (!existsSync(configToml)) {
      throw new Error('supabase/config.toml not found')
    }

    return {
      id: 'verify_workspace',
      status: 'completed',
      detail: 'Workspace files detected',
    }
  },
}
