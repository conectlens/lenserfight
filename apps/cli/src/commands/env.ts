import { defineCommand } from 'citty'
import {
  resolveConfig,
  configExists,
  loadConfig,
  getEffectiveMode,
} from '../config/project-config'
import { printJson, printTable } from '../utils/output'
import { c, sym } from '../utils/ansi'
import { byokKeyResolver } from '@lenserfight/providers'

type EnvStatus = 'set' | 'missing' | 'default'

interface EnvEntry {
  name: string
  status: EnvStatus
  value: string
  source: string
}

function mask(val: string | undefined | null): string {
  if (!val) return ''
  if (val.length <= 8) return '****'
  return val.slice(0, 4) + '…' + val.slice(-4)
}

function checkEnv(name: string, opts?: { secret?: boolean }): EnvEntry {
  const val = process.env[name]
  if (val) {
    return {
      name,
      status: 'set',
      value: opts?.secret ? mask(val) : val,
      source: 'env',
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
    const entries: EnvEntry[] = ENV_VARS.map((v) =>
      checkEnv(v.name, { secret: v.secret && !args.reveal })
    )

    // Add config file info
    const hasConfig = configExists()
    const config = hasConfig ? loadConfig() : null
    const resolved = resolveConfig()
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
      ['Variable', 'Status', 'Value'],
      entries.map((e) => [
        e.name,
        e.status === 'set'
          ? `${c.success(sym.pass)} set`
          : `${c.muted(sym.dot)} missing`,
        e.value || c.muted('-'),
      ]),
      [30, 12, 40]
    )

    console.log(`\n${c.bold('Project Config')}`)
    console.log(
      `  ${hasConfig ? c.success(sym.pass) : c.warn(sym.warn)} .lenserfight.json: ${hasConfig ? `present (mode=${config?.mode})` : 'not found'}`,
    )

    console.log(`\n${c.bold('BYOK Provider Keys')}`)
    for (const provider of ['openai', 'anthropic', 'google', 'mistral'] as const) {
      const has = byokKeyResolver.has(provider)
      console.log(`  ${has ? c.success(sym.pass) : c.muted(sym.dot)} ${provider}: ${has ? 'configured' : 'not set'}`)
    }

    console.log('')
  },
})
