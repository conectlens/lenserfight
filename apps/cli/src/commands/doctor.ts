import { defineCommand } from 'citty'
import {
  configExists,
  getOnboardingState,
  loadConfig,
  resolveConfig,
} from '../config/project-config'
import {
  detectCloudApi,
  detectDocker,
  detectNode,
  detectOllama,
  detectSupabaseCli,
} from '../lib/onboarding/detect'
import { byokKeyResolver } from '@lenserfight/providers'
import { formatCheck, printJson, printSuccess, printWarn, printError } from '../utils/output'

type DoctorCheckId = 'core' | 'api' | 'byok' | 'ollama'

export default defineCommand({
  meta: {
    name: 'doctor',
    description: 'Validate environment health for local and cloud LenserFight flows.',
  },
  args: {
    mode: {
      type: 'string',
      description: 'Check mode: local or cloud',
    },
    json: {
      type: 'boolean',
      description: 'Emit structured JSON',
      default: false,
    },
    check: {
      type: 'string',
      description: 'Run an additional targeted check: api, byok, ollama',
    },
  },
  async run({ args }) {
    const resolved = resolveConfig()
    const mode = args.mode === 'cloud' ? 'cloud' : args.mode === 'local' ? 'local' : resolved.mode
    const requestedCheck = (args.check as DoctorCheckId | undefined) ?? 'core'
    let hasError = false

    const results: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; detail: string }> = []
    const push = (id: string, status: 'pass' | 'warn' | 'fail', detail: string) => {
      results.push({ id, status, detail })
      if (status === 'fail') hasError = true
    }

    const node = detectNode()
    push('node', node.ok ? 'pass' : 'fail', node.detail)

    if (mode === 'local') {
      const supabase = detectSupabaseCli()
      push('supabase_cli', supabase.ok ? 'pass' : 'fail', supabase.detail)

      const docker = detectDocker()
      push('docker', docker.ok ? 'pass' : 'fail', docker.detail)
    }

    if (configExists()) {
      const config = loadConfig()
      push('project_config', 'pass', `.lenserfight.json present (mode=${config.mode})`)
    } else {
      push('project_config', 'warn', 'No .lenserfight.json found. Run `lf setup` or `lf init`.')
    }

    const onboarding = getOnboardingState()
    if (onboarding) {
      push('onboarding', onboarding.status === 'complete' ? 'pass' : 'warn', onboarding.status)
    }

    if (requestedCheck === 'api') {
      const api = await detectCloudApi(resolved.cloudApiUrl)
      push('cloud_api', api.ok ? 'pass' : 'fail', api.detail)
    }

    if (requestedCheck === 'ollama') {
      const ollama = await detectOllama(resolved.ollamaBaseUrl)
      push('ollama', ollama.ok ? 'pass' : 'fail', ollama.detail)
    }

    if (requestedCheck === 'byok') {
      const providers = ['openai', 'anthropic', 'google', 'mistral'] as const
      for (const provider of providers) {
        const ok = byokKeyResolver.has(provider)
        push(
          `byok_${provider}`,
          ok ? 'pass' : 'warn',
          ok ? 'Configured' : 'No key detected in the environment',
        )
      }
    }

    if (args.json) {
      printJson({
        mode,
        status: hasError ? 'failed' : 'passed',
        checks: results,
      })
      process.exitCode = hasError ? 1 : 0
      return
    }

    for (const result of results) {
      const line = formatCheck(result.status, result.id, result.detail)
      if (result.status === 'pass') printSuccess(line)
      else if (result.status === 'warn') printWarn(line)
      else printError(line)
    }

    if (hasError) {
      printError('Some checks failed.')
      process.exitCode = 1
    } else {
      printSuccess('All requested checks passed.')
    }
  },
})
