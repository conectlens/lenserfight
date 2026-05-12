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

// ─── lf byok setup --provider <name> ──────────────────────────────────────
//
// Phase BA: friendly first-run wizard. Reads the key from stdin (never an
// argv flag), delegates to `lf byok rotate`, then confirms via `lf byok list`.
const byokSetup = defineCommand({
  meta: {
    name: 'setup',
    description: 'First-run BYOK wizard. Reads key from stdin, rotates, then confirms via list.',
  },
  args: {
    provider: { type: 'string', description: 'Provider key (e.g. openai, anthropic)', required: true },
    agent: { type: 'string', description: 'agents.ai_lensers.id', required: true },
    hint: { type: 'string', description: 'Optional display hint (last 4 chars)', default: '' },
  },
  async run({ args }) {
    try {
      consola.box(`Set up BYOK for provider "${args.provider}"`)
      const key = await readStdin(`Paste your ${args.provider} API key (stdin): `)
      if (!key) {
        consola.error('No key entered. Aborting.')
        process.exitCode = 1
        return
      }
      const hint = args.hint || key.slice(-4)

      await callRpc<void>(
        'fn_byok_key_rotate',
        {
          p_agent_id: args.agent,
          p_provider: args.provider,
          p_new_encrypted: key,
          p_new_hint: hint,
        },
        { requireAuth: true }
      )
      consola.success(`Stored ${args.provider} key for agent ${args.agent}.`)

      // Confirm via list (re-uses fn_byok_key_hint).
      const rows = await callRpc<
        Array<{ provider: string; key_hint: string | null; is_valid: boolean }>
      >('fn_byok_key_hint', { p_agent_id: args.agent }, { requireAuth: true })
      const me = (rows ?? []).find((r) => r.provider === args.provider)
      if (me) {
        consola.info(`Confirmed: ${me.provider} ···· ${me.key_hint ?? '????'} (valid=${me.is_valid})`)
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf byok usage ──────────────────────────────────────────────────────────

const byokUsage = defineCommand({
  meta: {
    name: 'usage',
    description: 'Show the last 20 audit rows for a BYOK key.',
  },
  args: {
    key: { type: 'string', description: 'audit.byok_key_usage.key_id (UUID)', required: true },
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const rows = await callRpc<
        Array<{
          id: string
          key_id: string
          battle_id: string | null
          model_id: string
          called_at: string
          token_count: number
          caller_role: string
        }>
      >('fn_byok_usage_list', { p_key_id: args.key, p_limit: 20 }, { requireAuth: true })

      if (args.json) {
        printJson(rows)
        return
      }

      if (!rows.length) {
        consola.info('No usage records for this key.')
        return
      }

      printTable(
        ['date', 'battle_id', 'model', 'tokens'],
        rows.map((r) => [
          new Date(r.called_at).toLocaleString(),
          r.battle_id ? `${r.battle_id.slice(0, 8)}…` : '—',
          r.model_id,
          String(r.token_count),
        ])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── lf byok check-rotation ─────────────────────────────────────────────────

const byokCheckRotation = defineCommand({
  meta: {
    name: 'check-rotation',
    description: 'Check for BYOK keys overdue for rotation (90-day policy). Exits 1 if any found.',
  },
  args: {
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const overdue = await callRpc<
        Array<{
          id: string
          provider: string
          key_hint: string | null
          agent_id: string
          last_rotated_at: string | null
        }>
      >('fn_byok_rotation_due', {}, { requireAuth: true })

      if (args.json) {
        printJson(overdue)
        if (overdue.length > 0) process.exitCode = 1
        return
      }

      if (!overdue.length) {
        consola.success('All BYOK keys are within the 90-day rotation window.')
        return
      }

      const now = Date.now()
      consola.warn(`${overdue.length} key(s) overdue for rotation:`)
      printTable(
        ['provider', 'hint', 'last_rotated', 'days_overdue'],
        overdue.map((k) => {
          const rotatedAt = k.last_rotated_at ? new Date(k.last_rotated_at).getTime() : 0
          const daysOverdue = Math.floor((now - rotatedAt) / 86_400_000) - 90
          return [
            k.provider,
            k.key_hint ? `···· ${k.key_hint}` : '????',
            k.last_rotated_at ? new Date(k.last_rotated_at).toLocaleDateString() : 'never',
            String(Math.max(0, daysOverdue)),
          ]
        })
      )
      process.exitCode = 1
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
    setup: byokSetup,
    usage: byokUsage,
    'check-rotation': byokCheckRotation,
  },
})

export default byokCommand
export { byokCommand }
