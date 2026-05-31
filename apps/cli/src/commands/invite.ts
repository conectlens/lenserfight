import { defineCommand } from 'citty'
import consola from 'consola'
import { callRpc, handleError } from '../utils/api'
import { printTable, printJson } from '../utils/output'
import { markJourneyStep } from '../lib/onboarding/journey'

const VALID_ROLES = ['member', 'moderator', 'admin']
const VALID_INVITE_TYPES = ['public', 'private', 'link', 'qr']

// ── QR rendering in terminal ─────────────────────────────────────────────────

async function printQR(url: string): Promise<void> {
  try {
    // qrcode-terminal is available in the pnpm store
    const qrTerminal = await import('qrcode-terminal' as string) as {
      generate: (text: string, opts: { small: boolean }, cb: (qr: string) => void) => void
    }
    await new Promise<void>((resolve) => {
      qrTerminal.generate(url, { small: true }, (qr) => {
        consola.log('\n' + qr)
        resolve()
      })
    })
  } catch {
    // Fallback: print URL in a prominent box
    const bar = '─'.repeat(url.length + 4)
    consola.log(`\n┌${bar}┐`)
    consola.log(`│  ${url}  │`)
    consola.log(`└${bar}┘`)
    consola.log('\nPaste the URL above into a QR generator to share.\n')
  }
}

// ── battle invite: create ────────────────────────────────────────────────────

const battleCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a battle invite link (public, private, link, or qr).',
  },
  args: {
    battle: {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
    type: {
      type: 'string',
      description: `Invite type: ${VALID_INVITE_TYPES.join(' | ')}`,
      default: 'public',
    },
    target: {
      type: 'string',
      description: 'Handle or email for private invites',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (!VALID_INVITE_TYPES.includes(args.type)) {
      consola.error('Invalid --type "%s". Must be one of: %s', args.type, VALID_INVITE_TYPES.join(', '))
      process.exitCode = 1
      return
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battle_invite_create',
        {
          p_battle_id: args.battle,
          p_type: args.type,
          p_target_handle: args.target || null,
        },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(result)
        return
      }

      const url = String(result?.['invite_url'] ?? result?.['url'] ?? '')
      const token = String(result?.['token'] ?? result?.['id'] ?? '')

      consola.success('Battle invite created.')
      if (url) consola.info('URL:   %s', url)
      if (token) consola.info('Token: %s', token)
      consola.info('Type:  %s', args.type)

      if (args.type === 'qr' && url) {
        await printQR(url)
      }

      // mark journey step on first invite
      await markJourneyStep('invite_sent', true)
    } catch (err) {
      handleError(err)
    }
  },
})

// ── battle invite: qr ────────────────────────────────────────────────────────

const battleQR = defineCommand({
  meta: {
    name: 'qr',
    description: 'Render the battle invite QR code in the terminal.',
  },
  args: {
    battle: {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_battle_invite_create',
        { p_battle_id: args.battle, p_type: 'qr', p_target_handle: null },
        { requireAuth: true },
      )

      const url = String(result?.['invite_url'] ?? result?.['url'] ?? '')
      if (!url) {
        consola.error('No invite URL returned from server.')
        process.exitCode = 1
        return
      }

      consola.info('Scan this QR code to join the battle:')
      await printQR(url)
      consola.info('URL: %s', url)

      await markJourneyStep('invite_sent', true)
    } catch (err) {
      handleError(err)
    }
  },
})

// ── battle invite: stats ─────────────────────────────────────────────────────

const battleStats = defineCommand({
  meta: {
    name: 'stats',
    description: 'Show invite statistics for a battle.',
  },
  args: {
    battle: {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const stats = await callRpc<Record<string, unknown>>(
        'fn_battle_invite_stats',
        { p_battle_id: args.battle },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(stats)
        return
      }

      consola.info('Battle invite stats for %s', args.battle)
      consola.info('Link clicks:  %s', stats?.['clicks'] ?? 0)
      consola.info('QR scans:     %s', stats?.['qr_scans'] ?? 0)
      consola.info('Accepted:     %s', stats?.['accepted'] ?? 0)
      consola.info('Converted:    %s', stats?.['converted'] ?? 0)
    } catch (err) {
      handleError(err)
    }
  },
})

// ── battle invite: list ──────────────────────────────────────────────────────

const battleList = defineCommand({
  meta: {
    name: 'list',
    description: 'List invites for a battle.',
  },
  args: {
    battle: {
      type: 'string',
      description: 'Battle UUID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const invites = await callRpc<Array<Record<string, unknown>>>(
        'fn_battle_invite_list',
        { p_battle_id: args.battle },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(invites)
        return
      }

      if (!Array.isArray(invites) || invites.length === 0) {
        consola.info('No invites for this battle yet.')
        return
      }

      printTable(
        ['Token', 'Type', 'Target', 'Accepted', 'Created'],
        invites.map((inv) => [
          String(inv['token'] ?? inv['id'] ?? '—').substring(0, 10),
          String(inv['type'] ?? '—'),
          String(inv['target'] ?? '—'),
          String(inv['accepted_at'] ? new Date(String(inv['accepted_at'])).toLocaleDateString() : 'no'),
          inv['created_at'] ? new Date(String(inv['created_at'])).toLocaleDateString() : '—',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ── community invite: send (legacy flat behaviour) ───────────────────────────

const communitySend = defineCommand({
  meta: {
    name: 'send',
    description: 'Send a community invite to a user by handle or email.',
  },
  args: {
    target: {
      type: 'positional',
      description: 'Username or email to invite',
      required: true,
    },
    role: {
      type: 'string',
      description: `Role to assign: ${VALID_ROLES.join(' | ')}`,
      default: 'member',
    },
    message: {
      type: 'string',
      description: 'Optional personal message',
      default: '',
    },
    community: {
      type: 'string',
      description: 'Community slug (defaults to active community from context)',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    if (!VALID_ROLES.includes(args.role)) {
      consola.error('Invalid --role "%s". Must be one of: %s', args.role, VALID_ROLES.join(', '))
      process.exitCode = 1
      return
    }

    try {
      const result = await callRpc<Record<string, unknown>>(
        'fn_invite_send',
        {
          p_target: args.target,
          p_role: args.role,
          p_message: args.message || null,
          p_community: args.community || null,
        },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(result)
        return
      }

      consola.success('Invite sent to %s (role: %s).', args.target, args.role)
      if (result?.['id']) consola.info('Invite ID: %s', result['id'])
    } catch (err) {
      handleError(err)
    }
  },
})

// ── community invite: status ──────────────────────────────────────────────────

const communityStatus = defineCommand({
  meta: {
    name: 'status',
    description: 'Check the status of a community invite by ID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Invite ID',
      required: true,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const invite = await callRpc<Record<string, unknown>>(
        'fn_invite_status',
        { p_invite_id: args.id },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(invite)
        return
      }

      if (!invite) {
        consola.warn('Invite not found: %s', args.id)
        return
      }

      consola.info('ID:       %s', invite['id'])
      consola.info('Target:   %s', invite['target'] ?? '—')
      consola.info('Role:     %s', invite['role'] ?? '—')
      consola.info('Status:   %s', invite['status'] ?? '—')
      consola.info('Sent:     %s', invite['created_at'] ? new Date(String(invite['created_at'])).toLocaleDateString() : '—')
      consola.info('Expires:  %s', invite['expires_at'] ? new Date(String(invite['expires_at'])).toLocaleDateString() : '—')
    } catch (err) {
      handleError(err)
    }
  },
})

// ── community invite: revoke ──────────────────────────────────────────────────

const communityRevoke = defineCommand({
  meta: {
    name: 'revoke',
    description: 'Revoke a community invite by ID.',
  },
  args: {
    id: {
      type: 'positional',
      description: 'Invite ID',
      required: true,
    },
  },
  async run({ args }) {
    try {
      await callRpc('fn_invite_revoke', { p_invite_id: args.id }, { requireAuth: true })
      consola.success('Invite revoked: %s', args.id)
    } catch (err) {
      handleError(err)
    }
  },
})

// ── community invite: pending ─────────────────────────────────────────────────

const communityPending = defineCommand({
  meta: {
    name: 'pending',
    description: 'List pending community invites.',
  },
  args: {
    community: {
      type: 'string',
      description: 'Community slug',
      default: '',
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    try {
      const invites = await callRpc<Array<Record<string, unknown>>>(
        'fn_invites_pending',
        { p_community: args.community || null },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(invites)
        return
      }

      if (!Array.isArray(invites) || invites.length === 0) {
        consola.info('No pending invites.')
        return
      }

      printTable(
        ['ID', 'Target', 'Role', 'Sent'],
        invites.map((inv) => [
          String(inv['id'] ?? '—').substring(0, 8),
          String(inv['target'] ?? '—'),
          String(inv['role'] ?? '—'),
          inv['created_at'] ? new Date(String(inv['created_at'])).toLocaleDateString() : '—',
        ]),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ── Root command ──────────────────────────────────────────────────────────────

export default defineCommand({
  meta: {
    name: 'invite',
    description:
      'Manage invites. Use `lf invite create --battle <id>` for battle invites or `lf invite send <target>` for community invites.',
  },
  subCommands: {
    // battle invites
    create: () => Promise.resolve(battleCreate),
    qr: () => Promise.resolve(battleQR),
    stats: () => Promise.resolve(battleStats),
    list: () => Promise.resolve(battleList),
    // community invites
    send: () => Promise.resolve(communitySend),
    status: () => Promise.resolve(communityStatus),
    revoke: () => Promise.resolve(communityRevoke),
    pending: () => Promise.resolve(communityPending),
  },
})
