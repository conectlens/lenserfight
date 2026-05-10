import * as readline from 'node:readline'
import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

// Phase AR — `lf byok` surface
//
// Security note: new keys are ALWAYS read from stdin, never from a CLI
// argument, to prevent secrets appearing in shell history.

// ─── lf byok list ───────────────────────────────────────────────────────────

const byokList = defineCommand({
  meta: {
    name: 'list',
    description: 'List BYOK key hints for an agent (provider, hint, validity).',
  },
  args: {
    agent: { type: 'string', description: 'agents.ai_lensers.id', required: true },
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<
        Array<{
          provider: string
          key_hint: string | null
          label: string | null
          is_valid: boolean
        }>
      >('fn_byok_key_hint', { p_agent_id: args.agent }, { requireAuth: true })

      if (args.json) {
        printJson(rows)
        return
      }

      if (!rows.length) {
        consola.info('No BYOK keys registered for this agent.')
        return
      }

      printTable(
        ['provider', 'hint', 'label', 'valid'],
        rows.map((row) => [
          row.provider,
          `···· ${row.key_hint ?? '????'}`,
          row.label ?? '—',
          row.is_valid ? 'yes' : 'no (expired/revoked)',
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf byok rotate ─────────────────────────────────────────────────────────

function readStdin(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
    rl.question(prompt, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

const byokRotate = defineCommand({
  meta: {
    name: 'rotate',
    description: 'Rotate a BYOK key. Reads the new key from stdin.',
  },
  args: {
    agent: { type: 'string', description: 'agents.ai_lensers.id', required: true },
    provider: { type: 'string', description: 'Provider key (e.g. openai)', required: true },
    hint: { type: 'string', description: 'Last 4 chars of the new key (for display)', default: '' },
  },
  async run({ args }) {
    try {
      const newKey = await readStdin(`Enter new ${args.provider} API key (stdin): `)
      if (!newKey) throw new Error('No key entered.')

      const hint = args.hint || newKey.slice(-4)

      await callRpc<void>(
        'fn_byok_key_rotate',
        {
          p_agent_id: args.agent,
          p_provider: args.provider,
          p_new_encrypted: newKey,
          p_new_hint: hint,
        },
        { requireAuth: true }
      )

      consola.success(`Rotated ${args.provider} key for agent ${args.agent}.`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf byok revoke ─────────────────────────────────────────────────────────

const byokRevoke = defineCommand({
  meta: {
    name: 'revoke',
    description: 'Revoke a BYOK key (irreversible without re-registering).',
  },
  args: {
    agent: { type: 'string', description: 'agents.ai_lensers.id', required: true },
    provider: { type: 'string', description: 'Provider key', required: true },
    force: { type: 'boolean', description: 'Skip confirmation', default: false },
  },
  async run({ args }) {
    try {
      if (!args.force) {
        const confirm = await readStdin(
          `Revoke ${args.provider} key for agent ${args.agent}? Type "yes" to confirm: `
        )
        if (confirm !== 'yes') {
          consola.info('Aborted.')
          return
        }
      }

      await callRpc<void>(
        'fn_byok_key_revoke',
        { p_agent_id: args.agent, p_provider: args.provider },
        { requireAuth: true }
      )

      consola.success(`Revoked ${args.provider} key for agent ${args.agent}.`)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ─────────────────────────────────────────────────────────────────

const byokCommand = defineCommand({
  meta: {
    name: 'byok',
    description: 'Manage Bring-Your-Own-Key API credentials for an agent.',
  },
  subCommands: {
    list: byokList,
    rotate: byokRotate,
    revoke: byokRevoke,
  },
})

export default byokCommand
export { byokCommand }
