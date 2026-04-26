import { defineCommand } from 'citty';
import consola from 'consola';
import { callRpc, handleError } from '../utils/api';
import { printTable, printJson } from '../utils/output';

const VALID_ROLES = ['member', 'moderator', 'admin'];

export default defineCommand({
  meta: {
    name: 'invite',
    description: 'Invite users to a community, check status, revoke, or list pending invites.',
  },
  args: {
    target: {
      type: 'positional',
      description: 'Username or email to invite (omit when using --status, --revoke, or --list-pending)',
      required: false,
    },
    role: {
      type: 'string',
      description: `Role to assign: ${VALID_ROLES.join(' | ')}`,
      default: 'member',
    },
    message: {
      type: 'string',
      description: 'Optional personal message to include in the invite',
      default: '',
    },
    community: {
      type: 'string',
      description: 'Community slug (defaults to active community from context)',
      default: '',
    },
    status: {
      type: 'string',
      description: 'Check the status of an invite by ID',
      default: '',
    },
    revoke: {
      type: 'string',
      description: 'Revoke an invite by ID',
      default: '',
    },
    'list-pending': {
      type: 'boolean',
      description: 'List all pending invites for the active community',
      default: false,
    },
    json: {
      type: 'boolean',
      description: 'Output as JSON',
      default: false,
    },
  },
  async run({ args }) {
    // --status <id>
    if (args.status) {
      try {
        const invite = await callRpc<Record<string, unknown>>(
          'fn_invite_status',
          { p_invite_id: args.status },
          { requireAuth: true }
        );

        if (args.json) { printJson(invite); return; }

        if (!invite) { consola.warn('Invite not found: %s', args.status); return; }

        consola.info('ID:       %s', invite.id);
        consola.info('Target:   %s', invite.target ?? '—');
        consola.info('Role:     %s', invite.role ?? '—');
        consola.info('Status:   %s', invite.status ?? '—');
        consola.info('Sent:     %s', invite.created_at ? new Date(String(invite.created_at)).toLocaleDateString() : '—');
        consola.info('Expires:  %s', invite.expires_at ? new Date(String(invite.expires_at)).toLocaleDateString() : '—');
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // --revoke <id>
    if (args.revoke) {
      try {
        await callRpc('fn_invite_revoke', { p_invite_id: args.revoke }, { requireAuth: true });
        consola.success('Invite revoked: %s', args.revoke);
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // --list-pending
    if (args['list-pending']) {
      try {
        const invites = await callRpc<Array<Record<string, unknown>>>(
          'fn_invites_pending',
          { p_community: args.community || null },
          { requireAuth: true }
        );

        if (args.json) { printJson(invites); return; }

        if (!Array.isArray(invites) || invites.length === 0) {
          consola.info('No pending invites.');
          return;
        }

        printTable(
          ['ID', 'Target', 'Role', 'Sent'],
          invites.map((inv) => [
            String(inv.id ?? '—').substring(0, 8),
            String(inv.target ?? '—'),
            String(inv.role ?? '—'),
            inv.created_at ? new Date(String(inv.created_at)).toLocaleDateString() : '—',
          ])
        );
      } catch (err) {
        handleError(err);
      }
      return;
    }

    // send invite to <target>
    if (!args.target) {
      consola.error('Provide a username or email, or use --status / --revoke / --list-pending.');
      process.exitCode = 1;
      return;
    }

    if (!VALID_ROLES.includes(args.role)) {
      consola.error('Invalid --role "%s". Must be one of: %s', args.role, VALID_ROLES.join(', '));
      process.exitCode = 1;
      return;
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
        { requireAuth: true }
      );

      if (args.json) { printJson(result); return; }

      consola.success('Invite sent to %s (role: %s).', args.target, args.role);
      if (result?.id) consola.info('Invite ID: %s', result.id);
    } catch (err) {
      handleError(err);
    }
  },
});
