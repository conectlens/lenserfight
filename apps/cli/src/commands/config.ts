import { defineCommand } from 'citty'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv from 'ajv'
import {
  loadConfig,
  loadUserConfig,
  saveConfig,
  saveUserConfig,
  type ProjectConfig,
} from '../config/project-config'
import { printJson, printSuccess, printWarn } from '../utils/output'

interface ConfigExportPayload {
  projectConfig: ProjectConfig
  userConfig: {
    defaultAdapterId?: string
    communitySlug?: string
    onboarding?: Record<string, unknown>
  }
}

const ajv = new Ajv({ allErrors: true })

const projectConfigSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'dbPort', 'apiPort'],
  properties: {
    mode: { enum: ['local', 'cloud'] },
    supabaseUrl: { type: 'string' },
    cloudApiUrl: { type: 'string' },
    cloudId: { type: 'string' },
    defaultStorageAdapter: { enum: ['supabase', 'local'] },
    dbPort: { type: 'number' },
    apiPort: { type: 'number' },
    autoOpenBrowser: { type: 'boolean' },
    enabledApps: { type: 'array', items: { type: 'string' } },
  },
} as const

const validateProjectConfig = ajv.compile(projectConfigSchema)

function rejectUnsupportedStorageAdapter(adapter: string | undefined): void {
  if (adapter === 'r2') {
    throw new Error('Cloudflare R2 is not supported yet. Use "supabase" or "local".')
  }
}

const validate = defineCommand({
  meta: {
    name: 'validate',
    description: 'Validate the current project config and safe user config.',
  },
  args: {
    json: {
      type: 'boolean',
      description: 'Emit JSON output',
      default: false,
    },
  },
  async run({ args }) {
    const projectConfig = loadConfig()
    rejectUnsupportedStorageAdapter(projectConfig.defaultStorageAdapter)
    const valid = validateProjectConfig(projectConfig)

    if (args.json) {
      printJson({
        valid,
        errors: validateProjectConfig.errors ?? [],
      })
      process.exitCode = valid ? 0 : 1
      return
    }

    if (!valid) {
      printWarn('Config validation failed.')
      printJson(validateProjectConfig.errors ?? [])
      process.exitCode = 1
      return
    }

    printSuccess('Configuration is valid.')
  },
})

const exportConfig = defineCommand({
  meta: {
    name: 'export',
    description: 'Export safe project and user config without secrets.',
  },
  args: {
    out: {
      type: 'string',
      description: 'Target file path',
      required: true,
    },
  },
  async run({ args }) {
    const user = loadUserConfig()
    const payload: ConfigExportPayload = {
      projectConfig: loadConfig(),
      userConfig: {
        defaultAdapterId: user.defaultAdapterId,
        communitySlug: user.communitySlug,
        onboarding: user.onboarding,
      },
    }

    writeFileSync(resolve(process.cwd(), args.out), `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    printSuccess('Exported safe config to %s', args.out)
  },
})

const importConfig = defineCommand({
  meta: {
    name: 'import',
    description: 'Import a previously exported safe config.',
  },
  args: {
    file: {
      type: 'positional',
      description: 'Path to the exported config file',
      required: true,
    },
  },
  async run({ args }) {
    const raw = JSON.parse(readFileSync(resolve(process.cwd(), args.file), 'utf-8')) as ConfigExportPayload
    rejectUnsupportedStorageAdapter(raw.projectConfig.defaultStorageAdapter)
    const valid = validateProjectConfig(raw.projectConfig)
    if (!valid) {
      throw new Error(`Invalid project config import: ${ajv.errorsText(validateProjectConfig.errors)}`)
    }

    saveConfig(raw.projectConfig)
    saveUserConfig({
      defaultAdapterId: raw.userConfig.defaultAdapterId,
      communitySlug: raw.userConfig.communitySlug,
      onboarding: raw.userConfig.onboarding as Record<string, never> | undefined,
    })
    printSuccess('Imported safe config from %s', args.file)
  },
})

export default defineCommand({
  meta: {
    name: 'config',
    description: 'Validate, export, and import LenserFight config state.',
  },
  subCommands: {
    validate,
    export: exportConfig,
    import: importConfig,
  },
})
