import { defineCommand } from 'citty'
import consola from 'consola'
import { randomBytes } from 'node:crypto'
import { callRpc, handleError } from '../utils/api'

const generate = defineCommand({
  meta: {
    name: 'generate',
    description: 'Generate a 32-byte hex secret for app.webhook_signing_secret.',
  },
  args: {
    apply: {
      type: 'boolean',
      description: 'Also apply via SQL through the active service-role connection (requires SUPABASE_SERVICE_ROLE_KEY).',
      default: false,
    },
  },
  async run({ args }) {
    const hex = randomBytes(32).toString('hex')
    consola.info('Generated webhook signing secret (32 bytes, hex):')
    consola.log(hex)
    consola.log('')
    consola.info('Apply with one of:')
    consola.log('')
    consola.log(`  -- Postgres GUC (database-wide):`)
    consola.log(`  ALTER DATABASE postgres SET app.webhook_signing_secret = '${hex}';`)
    consola.log('')
    consola.log(`  -- Postgres GUC (session-scoped, for one-off testing):`)
    consola.log(`  SET app.webhook_signing_secret = '${hex}';`)
    consola.log('')

    if (args.apply) {
      try {
        await callRpc('fn_set_webhook_signing_secret', { p_secret: hex }, { useServiceRole: true })
        consola.success('Applied via fn_set_webhook_signing_secret.')
      } catch (err) {
        handleError(err)
        consola.warn('Auto-apply failed. Copy the SQL above and run it manually as a Postgres superuser.')
      }
    }
  },
})

const verify = defineCommand({
  meta: {
    name: 'verify',
    description: 'Check that app.webhook_signing_secret is set and not the literal string "unsigned".',
  },
  async run() {
    try {
      const result = await callRpc<{ is_set: boolean; length_bytes: number; strict_mode: boolean }>(
        'fn_check_webhook_signing_secret',
        {},
        { useServiceRole: true },
      )
      if (!result.is_set) {
        consola.error('app.webhook_signing_secret is NOT set. Webhook payloads will ship with X-Lenserfight-Signature: unsigned.')
        consola.warn('Run `lf config webhook-secret generate` and apply the printed ALTER DATABASE statement.')
        process.exitCode = 1
        return
      }
      consola.success(`Secret is set (${result.length_bytes} bytes). Strict signing mode: ${result.strict_mode ? 'ON' : 'OFF'}.`)
    } catch (err) {
      handleError(err)
    }
  },
})

const setStrict = defineCommand({
  meta: {
    name: 'strict',
    description: 'Toggle app.webhook_strict_signing — when ON, dispatcher refuses to send unsigned payloads.',
  },
  args: {
    mode: {
      type: 'positional',
      description: 'on | off',
      required: true,
    },
  },
  async run({ args }) {
    const mode = String(args.mode).toLowerCase()
    if (mode !== 'on' && mode !== 'off') {
      consola.error('mode must be "on" or "off"')
      process.exitCode = 1
      return
    }
    try {
      await callRpc('fn_set_webhook_strict_signing', { p_strict: mode === 'on' }, { useServiceRole: true })
      consola.success(`webhook strict signing: ${mode}`)
    } catch (err) {
      handleError(err)
    }
  },
})

export default defineCommand({
  meta: {
    name: 'webhook-secret',
    description: 'Manage app.webhook_signing_secret used by the audit.webhook_outbox HMAC dispatcher.',
  },
  subCommands: {
    generate,
    verify,
    strict: setStrict,
  },
})
