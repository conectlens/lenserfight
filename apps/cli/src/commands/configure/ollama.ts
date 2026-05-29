import { defineCommand } from 'citty'
import consola from 'consola'
import { getEffectiveMode, loadEnvConfig, resolveConfig } from '../../config/project-config'
import { OLLAMA_DEFAULT_BASE_URL } from '@lenserfight/providers'

export default defineCommand({
  meta: {
    name: 'ollama',
    description: 'Show Ollama base URL for local model execution and how to run a probe.',
  },
  args: {
    json: { type: 'boolean', default: false },
  },
  async run({ args }) {
    const env = loadEnvConfig()
    const config = resolveConfig()
    const base =
      env.ollamaBaseUrl ??
      config.ollamaBaseUrl ??
      process.env['OLLAMA_BASE_URL'] ??
      OLLAMA_DEFAULT_BASE_URL
    const { mode, source } = getEffectiveMode()

    const payload = {
      ollamaBaseUrl: base,
      effectiveMode: mode,
      modeSource: source,
      hints: [
        'lf keys list',
        'lf execute lens prompt --ollama --model llama3.2',
        'lf execute battle file-run <id>',
        'lf configure env',
      ],
    }

    if (args.json) {
      process.stdout.write(JSON.stringify(payload, null, 2) + '\n')
      return
    }

    consola.info('Ollama base URL: %s', base)
    consola.info('Effective API mode: %s (%s)', mode, source)
    consola.info('Local keys (file BYOK): lf configure keys list')
    consola.info('Cloud BYOK (Supabase):  lf configure byok list')
    consola.info('Test prompt:           lf execute prompt --ollama --model llama3.2 "ping"')
  },
})
