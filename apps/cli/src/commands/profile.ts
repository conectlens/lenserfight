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
import { handleError } from '../utils/api'
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
  },
})

export default profileCommand
export { profileCommand }
