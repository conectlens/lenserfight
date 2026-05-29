import { defineCommand } from 'citty'

/** `lf execute battle file-run` → `lf battle file run` */
export default defineCommand({
  meta: {
    name: 'file-run',
    description: 'Run a file-workspace battle (BYOK / Ollama). Alias for `lf battle file run`.',
  },
  args: {
    id: { type: 'positional', description: 'Battle id or slug', required: true },
    json: { type: 'boolean', default: false },
  },
  async run(ctx) {
    const battle = await import('../battle')
    const file = battle.default.subCommands?.['file'] as {
      subCommands?: Record<string, { run?: (c: typeof ctx) => Promise<void> }>
    }
    return file?.subCommands?.['run']?.run?.(ctx)
  },
})
