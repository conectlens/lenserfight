import { defineCommand } from 'citty'
import {
  resolveConfig,
  configExists,
  loadConfig,
  getEffectiveMode,
  type LenserfightConfig,
} from '../config/project-config'
import { maskSecret } from '../lib/redact'
import { printJson, printTable } from '../utils/output'
import { c, sym } from '../utils/ansi'
import { byokKeyResolver } from '@lenserfight/providers'

type EnvStatus = 'set' | 'missing'
type EnvSource = 'env' | 'config' | ''

interface EnvEntry {
  name: string
  status: EnvStatus
  value: string
  source: EnvSource
}

const CONFIG_FIELD_BY_ENV: Partial<
  Record<string, (config: LenserfightConfig) => string | undefined>
> = {
  SUPABASE_URL: (config) => config.supabaseUrl,
  SUPABASE_ANON_KEY: (config) => config.supabaseAnonKey,
  SUPABASE_SERVICE_ROLE_KEY: (config) => config.supabaseServiceRoleKey,
  LENSERFIGHT_API_URL: (config) => config.cloudApiUrl,
  OLLAMA_BASE_URL: (config) => config.ollamaBaseUrl,
}

function formatValue(
  raw: string | undefined,
  opts: { secret?: boolean; reveal?: boolean },
): string {
  if (!raw) return ''
  if (opts.secret) return maskSecret(raw, opts.reveal)
  return raw
}

function resolveEnvEntry(
  name: string,
  config: LenserfightConfig,
  opts?: { secret?: boolean; reveal?: boolean },
): EnvEntry {
  const fromEnv = process.env[name]
  if (fromEnv) {
    return {
      name,
      status: 'set',
      value: formatValue(fromEnv, opts),
      source: 'env',
    }
  }

  const fromConfig = CONFIG_FIELD_BY_ENV[name]?.(config)
  if (fromConfig) {
    return {
      name,
      status: 'set',
      value: formatValue(fromConfig, opts),
      source: 'config',
    }
  }

  return { name, status: 'missing', value: '', source: '' }
}

const ENV_VARS = [
  { name: 'SUPABASE_URL', secret: false },
  { name: 'SUPABASE_ANON_KEY', secret: true },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', secret: true },
  { name: 'LENSERFIGHT_API_URL', secret: false },
  { name: 'LENSERFIGHT_GATEWAY_URL', secret: false },
  { name: 'OPENAI_API_KEY', secret: true },
  { name: 'ANTHROPIC_API_KEY', secret: true },
  { name: 'GOOGLE_AI_API_KEY', secret: true },
  { name: 'MISTRAL_API_KEY', secret: true },
  { name: 'OLLAMA_BASE_URL', secret: false },
  { name: 'LF_LOCAL', secret: false },
  { name: 'LF_DEBUG', secret: false },
  { name: 'LF_LOCALE', secret: false },
  { name: 'LF_QUIET', secret: false },
  { name: 'NO_COLOR', secret: false },
  { name: 'CI', secret: false },
] as const

export default defineCommand({
  meta: {
    name: 'env',
    description: 'Show environment variable status for LenserFight CLI.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
    reveal: {
      type: 'boolean',
      description: 'Show full secret values (use with caution)',
      default: false,
    },
  },
  async run({ args }) {
    const resolved = resolveConfig()
    const entries: EnvEntry[] = ENV_VARS.map((v) =>
      resolveEnvEntry(v.name, resolved, {
        secret: v.secret,
        reveal: args.reveal,
      }),
    )

    const hasConfig = configExists()
    const config = hasConfig ? loadConfig() : null
    const { mode: effectiveMode, source: effectiveSource } = getEffectiveMode()

    if (args.json) {
      printJson({
        variables: entries,
        config: {
          present: hasConfig,
          projectMode: config?.mode ?? null,
          effectiveMode,
          effectiveModeSource: effectiveSource,
          supabaseUrl: resolved.supabaseUrl ?? null,
        },
        byok: {
          openai: byokKeyResolver.has('openai'),
          anthropic: byokKeyResolver.has('anthropic'),
          google: byokKeyResolver.has('google'),
          mistral: byokKeyResolver.has('mistral'),
        },
      })
      return
    }

    console.log(`\n${c.bold('Environment Variables')}\n`)

    printTable(
      ['Variable', 'Status', 'Source', 'Value'],
      entries.map((e) => [
        e.name,
        e.status === 'set'
          ? `${c.success(sym.pass)} set`
          : `${c.muted(sym.dot)} missing`,
        e.source ? c.muted(e.source) : c.muted('-'),
        e.value || c.muted('-'),
      ]),
      [28, 12, 8, 36],
    )

    console.log(`\n${c.bold('Project Config')}`)
    console.log(
      `  ${hasConfig ? c.success(sym.pass) : c.warn(sym.warn)} .lenserfight.json: ${hasConfig ? `present (mode=${config?.mode})` : 'not found'}`,
    )
    console.log(
      `  ${c.muted('effective mode:')} ${effectiveMode} ${c.muted(`(${effectiveSource})`)}`,
    )

    console.log(`\n${c.bold('BYOK Provider Keys')}`)
    for (const provider of ['openai', 'anthropic', 'google', 'mistral'] as const) {
      const has = byokKeyResolver.has(provider)
      console.log(
        `  ${has ? c.success(sym.pass) : c.muted(sym.dot)} ${provider}: ${has ? c.muted('configured (hidden)') : 'not set'}`,
      )
    }

    if (!args.reveal) {
      console.log(`\n${c.muted('Secrets are masked. Pass --reveal to show full values.')}`)
    }

    console.log('')
  },
})
