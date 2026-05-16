import { defineCommand } from 'citty'
import consola from 'consola'
import {
  deleteProfile,
  getActiveProfileName,
  listProfiles,
  loadProfile,
  saveProfile,
  setActiveProfileName,
  type LenserfightProfile,
} from '../utils/profiles'
import { callRpc, handleError } from '../utils/api'
import { printJson, printTable } from '../utils/output'

// ─── profile list ────────────────────────────────────────────────────────────

const profileList = defineCommand({
  meta: {
    name: 'list',
    description: 'List configured CLI profiles.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const names = await listProfiles()
      const active = await getActiveProfileName()

      if (names.length === 0) {
        consola.info('No profiles configured. Create one with `lf profile create --name <name> --url <supabase-url> --anon-key <key>`.')
        return
      }

      if (args.json) {
        printJson({ active, profiles: names })
        return
      }

      printTable(
        ['Name', 'Active'],
        names.map((n) => [n, n === active ? 'yes' : '']),
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile create ──────────────────────────────────────────────────────────

const profileCreate = defineCommand({
  meta: {
    name: 'create',
    description: 'Create a new CLI profile (~/.lenserfight/profiles/<name>.json, mode 0600).',
  },
  args: {
    name: { type: 'string', description: 'Profile name', required: true },
    url: { type: 'string', description: 'Supabase URL', required: true },
    'anon-key': { type: 'string', description: 'Supabase anon key', required: true },
    token: { type: 'string', description: 'Optional access token', default: '' },
    'default-workflow': {
      type: 'string',
      description: 'Optional default workflow UUID',
      default: '',
    },
  },
  async run({ args }) {
    try {
      const profile: LenserfightProfile = {
        name: args.name,
        supabase_url: args.url,
        supabase_anon_key: args['anon-key'],
        access_token: args.token || undefined,
        default_workflow_id: args['default-workflow'] || undefined,
        created_at: new Date().toISOString(),
      }
      await saveProfile(args.name, profile)
      consola.success('Profile "%s" created.', args.name)
      consola.info('Activate it with: lf profile use %s', args.name)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile use ─────────────────────────────────────────────────────────────

const profileUse = defineCommand({
  meta: {
    name: 'use',
    description: 'Set the active profile.',
  },
  args: {
    name: { type: 'positional', description: 'Profile name', required: true },
  },
  async run({ args }) {
    try {
      await setActiveProfileName(args.name)
      consola.success('Active profile is now "%s".', args.name)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile delete ──────────────────────────────────────────────────────────

const profileDelete = defineCommand({
  meta: {
    name: 'delete',
    description: 'Delete a CLI profile.',
  },
  args: {
    name: { type: 'positional', description: 'Profile name', required: true },
    force: {
      type: 'boolean',
      description: 'Delete even if it would leave you with no profile',
      default: false,
    },
  },
  async run({ args }) {
    try {
      await deleteProfile(args.name, { force: args.force })
      consola.success('Profile "%s" deleted.', args.name)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile show ────────────────────────────────────────────────────────────

const profileShow = defineCommand({
  meta: {
    name: 'show',
    description: 'Show a profile (the active one if no name is given). Tokens are redacted.',
  },
  args: {
    name: { type: 'positional', description: 'Profile name', required: false },
    json: { type: 'boolean', description: 'Output as JSON (tokens still redacted)', default: false },
  },
  async run({ args }) {
    try {
      const target = args.name || (await getActiveProfileName())
      const profile = await loadProfile(target)

      const redacted: LenserfightProfile = {
        ...profile,
        access_token: profile.access_token ? '••••••' : undefined,
        refresh_token: profile.refresh_token ? '••••••' : undefined,
      }

      if (args.json) {
        printJson(redacted)
        return
      }

      consola.info('Name:                %s', redacted.name)
      consola.info('Supabase URL:        %s', redacted.supabase_url)
      consola.info('Anon key:            %s', redacted.supabase_anon_key.slice(0, 12) + '…')
      consola.info('Access token:        %s', redacted.access_token ?? '—')
      consola.info('Refresh token:       %s', redacted.refresh_token ?? '—')
      consola.info('Default workflow ID: %s', redacted.default_workflow_id ?? '—')
      consola.info('Created at:          %s', redacted.created_at)
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile update ─────────────────────────────────────────────────────────

const profileUpdate = defineCommand({
  meta: {
    name: 'update',
    description: 'Update your Lenser profile fields on the active backend.',
  },
  args: {
    handle: { type: 'string', description: 'Public handle, without @', default: '' },
    'display-name': { type: 'string', description: 'Public display name', default: '' },
    bio: { type: 'string', description: 'Short public bio', default: '' },
    'avatar-url': { type: 'string', description: 'Avatar image URL', default: '' },
    website: { type: 'string', description: 'Personal website URL', default: '' },
    json: { type: 'boolean', description: 'Output updated profile as JSON', default: false },
  },
  async run({ args }) {
    const patch: Record<string, string> = {}
    if (args.handle) patch.handle = String(args.handle).replace(/^@/, '')
    if (args['display-name']) patch.display_name = args['display-name']
    if (args.bio) patch.bio = args.bio
    if (args['avatar-url']) patch.avatar_url = args['avatar-url']
    if (args.website) patch.website = args.website

    if (Object.keys(patch).length === 0) {
      consola.error('Pass at least one field to update: --handle, --display-name, --bio, --avatar-url, or --website.')
      process.exitCode = 1
      return
    }

    try {
      const updated = await callRpc<Record<string, unknown>>(
        'fn_lensers_update_profile',
        { p_data: patch },
        { requireAuth: true },
      )

      if (args.json) {
        printJson(updated)
        return
      }

      consola.success('Profile updated.')
      if (updated?.['handle']) consola.info('Handle:       @%s', updated['handle'])
      if (updated?.['display_name']) consola.info('Display name: %s', updated['display_name'])
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile xp ──────────────────────────────────────────────────────────────

const profileXp = defineCommand({
  meta: {
    name: 'xp',
    description: 'Show XP summary (total XP, level, rank) for your platform account.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const xp = await callRpc<{
        total_xp: number;
        current_level: number;
        rank: number | null;
      }>('fn_xp_get_summary', {}, { requireAuth: true })

      if (!xp) {
        consola.info('No XP data found. Join a battle to start earning XP.')
        return
      }

      if (args.json) { printJson(xp); return }

      consola.info('Total XP:  %s', xp.total_xp)
      consola.info('Level:     %s', xp.current_level)
      consola.info('Rank:      %s', xp.rank ?? '—')
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile badges ──────────────────────────────────────────────────────────

const profileBadges = defineCommand({
  meta: {
    name: 'badges',
    description: 'List badges earned on your platform account.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const badges = await callRpc<Array<{
        type: string;
        label: string;
        description: string | null;
        awarded_at: string;
      }>>('fn_lenser_badges', {}, { requireAuth: true })

      if (!badges?.length) {
        consola.info('No badges yet. Complete battles and verify your device to earn badges.')
        return
      }

      if (args.json) { printJson(badges); return }

      printTable(
        ['Badge', 'Label', 'Awarded At'],
        badges.map((b) => [b.type, b.label, new Date(b.awarded_at).toLocaleDateString()])
      )
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── profile trust ────────────────────────────────────────────────────────────

const profileTrust = defineCommand({
  meta: {
    name: 'trust',
    description: 'Show your platform trust score and contributing factors.',
  },
  args: {
    json: { type: 'boolean', description: 'Output as JSON', default: false },
  },
  async run({ args }) {
    try {
      const trust = await callRpc<{
        score: number;
        score_type: string;
        uncertainty: number | null;
        factors: Record<string, unknown> | null;
      }>('fn_lenser_trust_score', {}, { requireAuth: true })

      if (!trust) {
        consola.info('No trust score yet. Complete battles and register a device to build trust.')
        return
      }

      if (args.json) { printJson(trust); return }

      consola.info('Trust score:  %s', trust.score.toFixed(2))
      consola.info('Uncertainty:  %s', trust.uncertainty?.toFixed(2) ?? '—')

      if (trust.factors) {
        consola.info('Factors:')
        for (const [key, val] of Object.entries(trust.factors)) {
          consola.info('  %s: %s', key, val)
        }
      }
    } catch (err) {
      handleError(err)
    }
  },
})

// ─── parent ──────────────────────────────────────────────────────────────────

const profileCommand = defineCommand({
  meta: {
    name: 'profile',
    description: 'Manage CLI profiles for talking to multiple Supabase backends.',
  },
  subCommands: {
    list: profileList,
    create: profileCreate,
    use: profileUse,
    delete: profileDelete,
    show: profileShow,
    update: profileUpdate,
    xp: profileXp,
    badges: profileBadges,
    trust: profileTrust,
  },
})

export default profileCommand
export { profileCommand }
