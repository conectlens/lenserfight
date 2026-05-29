import { defineCommand } from 'citty'
import {
  configExists,
  getEffectiveMode,
  getOnboardingState,
  loadConfig,
  resolveConfig,
} from '../config/project-config'
import { isAuthenticated } from '../utils/auth'
import {
  fetchJourneyState,
  JOURNEY_STEPS,
  nextRequiredStep,
  countCompleted,
} from '../lib/onboarding/journey'
import {
  detectNode,
  detectSupabaseCli,
  detectDocker,
} from '../lib/onboarding/detect'
import { printJson, printWarn } from '../utils/output'
import { A, c, sym } from '../utils/ansi'

export default defineCommand({
  meta: {
    name: 'status',
    description: 'Show auth, environment, and developer journey status.',
  },
  args: {
    journey: {
      type: 'boolean',
      description: 'Show developer journey checklist (requires auth)',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Emit structured JSON',
      default: false,
    },
  },
  async run({ args }) {
    const config = resolveConfig()
    const { mode: effectiveMode, source: effectiveSource } = getEffectiveMode()
    const onboarding = getOnboardingState()
    const project = configExists() ? loadConfig() : null
    const authed = isAuthenticated()

    // Journey state: always fetch when authenticated (cheap call, best-effort)
    let journeyState = null
    if (authed) {
      journeyState = await fetchJourneyState()
    }

    // ── JSON ──────────────────────────────────────────────────────────────
    if (args.json) {
      const payload: Record<string, unknown> = {
        projectConfigPresent: !!project,
        mode: effectiveMode,
        modeSource: effectiveSource,
        projectMode: project?.mode ?? null,
        supabaseUrl: config.supabaseUrl || null,
        cloudApiUrl: config.cloudApiUrl || null,
        supabaseAnonKeyPresent: !!config.supabaseAnonKey,
        serviceRoleKeyPresent: !!config.supabaseServiceRoleKey,
        authStatus: authed ? 'authenticated' : 'not_authenticated',
        developerTokenStatus: config.developerToken
          ? config.developerTokenExpiresAt
            ? `set (expires ${config.developerTokenExpiresAt})`
            : 'set'
          : 'not_set',
        onboarding,
        defaultStorageAdapter: config.defaultStorageAdapter ?? null,
        ollamaBaseUrl: config.ollamaBaseUrl ?? null,
      }
      if (journeyState) {
        const { done, total } = countCompleted(journeyState)
        payload['journey'] = { progress: { done, total }, steps: journeyState }
      }
      printJson(payload)
      return
    }

    // ── Human-readable ────────────────────────────────────────────────────
    const sep = `${A.gray}${'─'.repeat(38)}${A.reset}`

    if (!project) {
      printWarn('Project config missing. Run `lf setup` or `lf init`.')
    }

    console.log(`\n${c.bold('LenserFight Status')}`)
    console.log(sep)

    // Auth row
    const authMark = authed ? c.success(`${sym.pass} authenticated`) : c.error(`${sym.fail} not authenticated`)
    console.log(`Auth          ${authMark}`)

    // Mode row (effective API target: Cloud vs Supabase local)
    const modeLabel =
      effectiveMode === 'local' ? c.localhost('Supabase local') : c.cloud('Cloud')
    const modeSuffix =
      effectiveSource === 'env-local' || effectiveSource === 'env-cloud'
        ? c.warn(` (${effectiveSource === 'env-local' ? '--local' : '--cloud'} override)`)
        : c.muted(` — switch: lf use ${effectiveMode === 'local' ? 'cloud' : 'local'}`)
    console.log(`API mode      ${c.bold(modeLabel)}${modeSuffix}`)
    console.log(`File workspace ${c.success(sym.pass)}  always available (lf validate, lf battle file)`)

    // Environment row
    const node = detectNode()
    if (effectiveMode === 'local') {
      const supabase = detectSupabaseCli()
      const docker = detectDocker()
      const envOk = node.ok && supabase.ok && docker.ok
      const envMark = envOk ? c.success(sym.pass) : c.warn(sym.warn)
      console.log(
        `Environment   ${envMark}  Node ${node.detail} ${c.muted(sym.dot)} Supabase CLI ${supabase.ok ? supabase.detail : c.error('missing')} ${c.muted(sym.dot)} Docker ${docker.ok ? docker.detail : c.error(docker.detail)}`,
      )
    } else {
      const mark = node.ok ? c.success(sym.pass) : c.error(sym.fail)
      console.log(`Environment   ${mark}  Node ${node.detail}`)
    }

    console.log(`API           ${config.cloudApiUrl ?? c.muted('(not set)')}`)

    if (onboarding) {
      const envMark =
        onboarding.status === 'complete' ? c.success(onboarding.status) : c.warn(onboarding.status)
      console.log(`Env setup     ${envMark}  (${onboarding.updatedAt})`)
    }

    // Journey section
    if (journeyState) {
      console.log('')
      console.log(c.bold('Journey'))
      for (const step of JOURNEY_STEPS) {
        const done = journeyState[step.id]
        const mark = done ? c.success(sym.pass) : c.error(sym.fail)
        const label = step.id.replace(/_/g, ' ').padEnd(24)
        console.log(`  ${mark}  ${c.muted(label)}  ${done ? c.muted('done') : c.muted('not yet')}`)
      }
      const { done, total } = countCompleted(journeyState)
      console.log('')
      console.log(`  Progress: ${done} / ${total} steps done`)
      const next = nextRequiredStep(journeyState)
      if (next) {
        console.log('')
        console.log(`  ${c.bold('Next action:')} ${c.accent(next.command)}`)
      }
    } else if (authed) {
      console.log('')
      console.log(`Journey       ${c.muted('unavailable — run `lf setup` or visit /getting-started')}`)
    } else {
      console.log('')
      console.log(`Journey       ${c.muted('sign in to see your journey — run `lf auth login`')}`)
    }

    console.log(sep)
    console.log('')
  },
})
