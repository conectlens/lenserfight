import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  LOCAL_ANON_KEY,
  LOCAL_SUPABASE_URL,
  ensureUserConfigDir,
  projectConfigExists,
  saveConfig,
  saveUserPreferences,
} from '../../../config/project-config'
import type { OnboardingStep } from '../schema'

export const configureProjectStep: OnboardingStep = {
  id: 'configure_project',
  label: 'Configure project',
  async run(options) {
    ensureUserConfigDir()

    if (!options.dryRun) {
      const prefs = {
        mode: options.mode,
        dbPort: 54322,
        apiPort: 54321,
      };
      if (projectConfigExists()) {
        saveConfig(prefs);
      } else {
        saveUserPreferences(prefs);
      }
    }

    const envLocalPath = resolve(process.cwd(), '.env.local')
    if (!existsSync(envLocalPath) && options.mode === 'local') {
      const lines = [
        `SUPABASE_URL=${LOCAL_SUPABASE_URL}`,
        `SUPABASE_ANON_KEY=${LOCAL_ANON_KEY}`,
        `API_URL=${LOCAL_SUPABASE_URL}/functions/v1`,
      ]
      if (options.ollamaBaseUrl) {
        lines.push(`LENSERFIGHT_OLLAMA_BASE_URL=${options.ollamaBaseUrl}`)
        lines.push(`OLLAMA_BASE_URL=${options.ollamaBaseUrl}`)
      }
      if (!options.dryRun) {
        writeFileSync(envLocalPath, `${lines.join('\n')}\n`, 'utf-8')
      }
    }

    return {
      id: 'configure_project',
      status: 'completed',
      detail: options.dryRun
        ? 'Project config preview generated'
        : 'Project config prepared',
    }
  },
}
