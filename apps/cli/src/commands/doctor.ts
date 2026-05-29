import { defineCommand } from 'citty'
import {
  configExists,
  getEffectiveMode,
  getOnboardingState,
  getUserPreferencesPath,
  loadConfig,
  resolveConfig,
  userPreferencesExist,
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
import { isAuthenticated, getUserInfo } from '../utils/auth'
import { callRpc } from '../utils/api'
import { CHECK_ID_TO_CODE, type OnboardingErrorCode } from '../lib/onboarding/errors'
import { checkForUpdate } from '@lenserfight/utils/update-check'
import { readCliVersion } from '../lib/version'
import { getQuote, formatQuote } from '../i18n'

type DoctorCheckId = 'core' | 'api' | 'byok' | 'ollama' | 'auth' | 'journey'

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
      description: 'Run an additional targeted check: api, byok, ollama, auth, journey',
    },
  },
  async run({ args }) {
    const resolved = resolveConfig()
    const effective = getEffectiveMode()
    const mode =
      args.mode === 'cloud' ? 'cloud' : args.mode === 'local' ? 'local' : effective.mode
    const requestedCheck = (args.check as DoctorCheckId | undefined) ?? 'core'
    let hasError = false

    const results: Array<{ id: string; status: 'pass' | 'warn' | 'fail'; detail: string; code?: OnboardingErrorCode }> = []
    const push = (id: string, status: 'pass' | 'warn' | 'fail', detail: string) => {
      const code = status !== 'pass' ? CHECK_ID_TO_CODE[id] : undefined
      results.push({ id, status, detail, ...(code ? { code } : {}) })
      if (status === 'fail') hasError = true
    }

    // ── Core checks (always run) ─────────────────────────────────────────
    const node = detectNode()
    push('node', node.ok ? 'pass' : 'fail', node.detail)

    if (mode === 'local') {
      const supabase = detectSupabaseCli()
      push('supabase_cli', supabase.ok ? 'pass' : 'fail', supabase.detail)

      const docker = detectDocker()
      push('docker', docker.ok ? 'pass' : 'fail', docker.detail)
    } else {
      push('supabase_local', 'pass', 'skipped — Cloud/file workspace (use lf doctor --mode local for Docker checks)')
    }

    if (configExists()) {
      const config = loadConfig()
      push('project_config', 'pass', `.lenserfight/lenserfight.json present (mode=${config.mode})`)
    } else if (userPreferencesExist()) {
      const { mode, source } = getEffectiveMode()
      push('project_config', 'pass', `User config ${getUserPreferencesPath()} (mode=${mode}, source=${source})`)
    } else {
      push('project_config', 'warn', 'No user or project config. Run `lf init`.')
    }

    const onboarding = getOnboardingState()
    if (onboarding) {
      push('onboarding', onboarding.status === 'complete' ? 'pass' : 'warn', onboarding.status)
    }

    // ── Auth check ───────────────────────────────────────────────────────
    if (requestedCheck === 'auth' || requestedCheck === 'core') {
      if (!isAuthenticated()) {
        push('auth', 'warn', 'Not authenticated. Run `lf auth login`.')
      } else {
        try {
          const info = await getUserInfo()
          if (info?.email) {
            push('auth', 'pass', `Token valid — ${info.email}`)
          } else {
            push('auth', 'warn', 'Token stored but user info unavailable. Try `lf auth login`.')
          }
        } catch {
          push('auth', 'fail', 'Token present but /auth/v1/user returned an error. Run `lf auth login`.')
        }
      }
    }

    // ── API reachability ─────────────────────────────────────────────────
    if (requestedCheck === 'api' || requestedCheck === 'core') {
      const api = await detectCloudApi(resolved.cloudApiUrl)
      push('cloud_api', api.ok ? 'pass' : 'fail', api.detail)
    }

    // ── Journey state readable ────────────────────────────────────────────
    if (requestedCheck === 'journey') {
      if (!isAuthenticated()) {
        push('journey_state', 'warn', 'Not authenticated — cannot read journey state.')
      } else {
        try {
          await callRpc('fn_journey_state_get', {}, { requireAuth: true })
          push('journey_state', 'pass', 'fn_journey_state_get reachable')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          push(
            'journey_state',
            'warn',
            `fn_journey_state_get failed: ${msg}. Migration may not yet be applied.`,
          )
        }
      }
    }

    // ── Ollama check ──────────────────────────────────────────────────────
    if (requestedCheck === 'ollama') {
      const ollama = await detectOllama(resolved.ollamaBaseUrl)
      push('ollama', ollama.ok ? 'pass' : 'fail', ollama.detail)
    }

    // ── BYOK key checks ───────────────────────────────────────────────────
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

    // ── CLI version freshness ─────────────────────────────────────────────
    if (requestedCheck === 'core') {
      const updateResult = await checkForUpdate(readCliVersion())
      if (updateResult === null) {
        push('cli_version', 'warn', 'Could not check for updates (offline or skipped).')
      } else if (updateResult.hasUpdate) {
        push(
          'cli_version',
          'warn',
          `Update available: v${updateResult.current} → v${updateResult.latest}. Run \`lf update\`.`,
        )
      } else {
        push('cli_version', 'pass', `v${updateResult.current} (up to date)`)
      }
    }

    // ── Output ────────────────────────────────────────────────────────────
    if (args.json) {
      printJson({ mode, status: hasError ? 'failed' : 'passed', checks: results })
      process.exitCode = hasError ? 1 : 0
      return
    }

    // Phase BA — one-liner remediation hint per failing check id.
    const FIX_HINT: Record<string, string> = {
      auth: 'run: lf auth login',
      cloud_api: 'check connectivity, set LENSERFIGHT_API_URL if behind a proxy',
      node: 'install Node 18+ (https://nodejs.org)',
      supabase_cli: 'install: brew install supabase/tap/supabase',
      docker: 'install Docker Desktop',
      project_config: 'run: lf setup --mode local',
      ollama: 'install: https://ollama.com',
      byok_openai: 'run: lf byok setup --provider openai --agent <agent-id>',
      byok_anthropic: 'run: lf byok setup --provider anthropic --agent <agent-id>',
      byok_google: 'run: lf byok setup --provider google --agent <agent-id>',
      byok_mistral: 'run: lf byok setup --provider mistral --agent <agent-id>',
      journey_state: 'apply migrations: pnpm supabase:db:reset',
      cli_version: 'run: lf update',
    }

    for (const result of results) {
      const line = formatCheck(result.status, result.id, result.detail)
      if (result.status === 'pass') printSuccess(line)
      else if (result.status === 'warn') printWarn(line)
      else printError(line)

      if (result.status !== 'pass' && FIX_HINT[result.id]) {
        printWarn(`    ↳ ${FIX_HINT[result.id]}`)
      }
    }

    if (hasError) {
      printError('Some checks failed.')
      const hint = formatQuote(getQuote('doctor.warning'))
      if (hint) printWarn(`  ${hint}`)
      process.exitCode = 1
    } else {
      printSuccess('All requested checks passed.')
      const hint = formatQuote(getQuote('doctor.success'))
      if (hint) printSuccess(`  ${hint}`)
    }
  },
})
