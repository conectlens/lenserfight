// `lf keys` — Local BYOK key management.
//
// Local keys are encrypted at rest under a master passphrase held in the OS
// keychain and stored in ~/.lenserfight/keys/. The same store is read by
// `apps/gateway` so the LenserFight web app can resolve keys through the
// loopback gateway without ever caching ciphertext in the browser.
//
// SECURITY: every command that takes a secret reads it from stdin via
// `readStdin`, never from argv. Echo is suppressed when possible so the key
// does not appear in shell history or scrollback.

import { defineCommand } from 'citty'
import consola from 'consola'
import * as readline from 'node:readline'

import { randomBytes } from 'node:crypto'

import {
  defaultPassphraseProvider,
  ensureKeysDir,
  getKeysDir,
  LocalKeyStore,
  LocalKeyStoreError,
} from '@lenserfight/data/local-keys'

import { printJson, printTable } from '../utils/output'

function readStdin(prompt: string, opts: { secret?: boolean } = {}): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stderr })
    if (opts.secret && process.stdin.isTTY) {
      // citty has no native muted prompt; rely on terminal echo-off by
      // intercepting the keystroke output. This mirrors the upstream readline
      // recipe used elsewhere in this CLI.
      const stream = process.stderr as NodeJS.WriteStream & { _writeToOutput?: (s: string) => void }
      let muted = false
      const original = stream.write.bind(stream)
      stream.write = ((chunk: string | Uint8Array) => {
        if (muted && typeof chunk === 'string' && chunk !== prompt) return true
        return original(chunk as never)
      }) as typeof stream.write
      rl.question(prompt, (answer) => {
        stream.write = original
        process.stderr.write('\n')
        rl.close()
        resolve(answer)
      })
      muted = true
    } else {
      rl.question(prompt, (answer) => {
        rl.close()
        resolve(answer.trim())
      })
    }
  })
}

function newStore(): LocalKeyStore {
  return new LocalKeyStore({ passphraseProvider: defaultPassphraseProvider })
}

function reportError(err: unknown): never {
  // Allow tests (and any other deliberate exits) to bubble up unchanged.
  if (err instanceof Error && /^__exit__:/.test(err.message)) {
    throw err
  }
  if (err instanceof LocalKeyStoreError) {
    consola.error(`${err.code}: ${err.message}`)
  } else {
    consola.error((err as Error).message)
  }
  process.exit(1)
}

// ─── lf keys init ───────────────────────────────────────────────────────────

const keysInit = defineCommand({
  meta: {
    name: 'init',
    description:
      'Generate a master passphrase, store it in the OS keychain, and create ~/.lenserfight/keys/.',
  },
  args: {
    force: { type: 'boolean', description: 'Overwrite an existing passphrase', default: false },
  },
  async run({ args }) {
    try {
      const provider = defaultPassphraseProvider
      const already = await provider.isConfigured()
      if (already && !args.force) {
        consola.warn(
          'A master passphrase is already configured. Re-run with --force to replace it. ' +
            'WARNING: replacing the passphrase makes all existing keys unrecoverable.'
        )
        process.exit(2)
      }
      const passphrase = randomBytes(32).toString('base64url')
      await provider.set(passphrase)
      await ensureKeysDir()
      consola.success('Master passphrase stored in OS keychain (service: lenserfight-keys).')
      consola.info(`Keys directory: ${getKeysDir()}`)
      consola.info('Run `lf keys add` to add your first key.')
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys list ───────────────────────────────────────────────────────────

const keysList = defineCommand({
  meta: { name: 'list', description: 'List local BYOK keys (metadata only).' },
  args: {
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const items = await newStore().list()
      if (args.json) {
        printJson(items)
        return
      }
      if (items.length === 0) {
        consola.info('No local keys yet. Run `lf keys add` to add one.')
        return
      }
      printTable(
        ['provider', 'label', 'id', 'createdAt'],
        items.map((k) => [k.provider, k.label, k.id, k.createdAt])
      )
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys add ────────────────────────────────────────────────────────────

const keysAdd = defineCommand({
  meta: {
    name: 'add',
    description:
      'Add a new local BYOK key. Provider/label come from flags; the key value is read from stdin.',
  },
  args: {
    provider: { type: 'string', description: 'Provider key (e.g. openai)', required: true },
    label: { type: 'string', description: 'Friendly label', default: '' },
  },
  async run({ args }) {
    try {
      const label = args.label || args.provider
      const rawKey = await readStdin('API key (echo suppressed): ', { secret: true })
      if (!rawKey) {
        consola.error('Empty key. Aborting.')
        process.exit(1)
      }
      const meta = await newStore().add({ provider: args.provider, label, rawKey })
      consola.success(`Stored key ${meta.id} for ${meta.provider} (${meta.label}).`)
      consola.info('Encrypted at rest under your master passphrase. Never sent to LenserFight servers.')
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys update ─────────────────────────────────────────────────────────

const keysUpdate = defineCommand({
  meta: {
    name: 'update',
    description: 'Update a key label and/or rotate its value (reads new value from stdin).',
  },
  args: {
    id: { type: 'positional', description: 'Key id', required: true },
    label: { type: 'string', description: 'New label', default: '' },
    rotate: { type: 'boolean', description: 'Prompt for a new key value', default: false },
  },
  async run({ args }) {
    try {
      let rawKey: string | undefined
      if (args.rotate) {
        rawKey = await readStdin('New API key (echo suppressed): ', { secret: true })
        if (!rawKey) {
          consola.error('Empty key. Aborting.')
          process.exit(1)
        }
      }
      const meta = await newStore().update({
        id: args.id,
        label: args.label || undefined,
        rawKey,
      })
      consola.success(`Updated key ${meta.id}.`)
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys rotate ─────────────────────────────────────────────────────────

const keysRotate = defineCommand({
  meta: { name: 'rotate', description: 'Replace a key’s value. Reads the new value from stdin.' },
  args: {
    id: { type: 'positional', description: 'Key id', required: true },
  },
  async run({ args }) {
    try {
      const rawKey = await readStdin('New API key (echo suppressed): ', { secret: true })
      if (!rawKey) {
        consola.error('Empty key. Aborting.')
        process.exit(1)
      }
      await newStore().update({ id: args.id, rawKey })
      consola.success(`Rotated key ${args.id}.`)
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys remove ─────────────────────────────────────────────────────────

const keysRemove = defineCommand({
  meta: { name: 'remove', description: 'Delete a local key permanently.' },
  args: {
    id: { type: 'positional', description: 'Key id', required: true },
    yes: { type: 'boolean', description: 'Skip confirmation prompt', default: false },
  },
  async run({ args }) {
    try {
      if (!args.yes) {
        const answer = await readStdin(`Delete key ${args.id}? Type 'yes' to confirm: `)
        if (answer.toLowerCase() !== 'yes') {
          consola.info('Aborted.')
          process.exit(2)
        }
      }
      await newStore().remove(args.id)
      consola.success(`Removed key ${args.id}.`)
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys export ─────────────────────────────────────────────────────────

const keysExport = defineCommand({
  meta: {
    name: 'export',
    description:
      'Print a key’s plaintext value to stdout. Requires --i-understand to acknowledge the risk.',
  },
  args: {
    id: { type: 'positional', description: 'Key id', required: true },
    'i-understand': {
      type: 'boolean',
      description: 'I understand this prints the plaintext key to stdout',
      default: false,
    },
  },
  async run({ args }) {
    if (!args['i-understand']) {
      consola.error(
        'Refusing to print plaintext. Re-run with --i-understand if you genuinely need the secret.'
      )
      process.exit(2)
    }
    try {
      consola.warn(
        'Printing plaintext key to stdout. This will be visible in shell scrollback and process listings.'
      )
      const value = await newStore().resolve(args.id)
      process.stdout.write(value)
      process.stdout.write('\n')
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys doctor ─────────────────────────────────────────────────────────

const keysDoctor = defineCommand({
  meta: { name: 'doctor', description: 'Validate keys directory permissions and envelope integrity.' },
  args: {
    json: { type: 'boolean', description: 'Output raw JSON', default: false },
  },
  async run({ args }) {
    try {
      const report = await newStore().doctor()
      if (args.json) {
        printJson(report)
        process.exit(report.fileIssues.length === 0 && report.passphrasePresent ? 0 : 1)
      }
      consola.info(`Keys directory: ${getKeysDir()}`)
      consola.info(`Passphrase configured: ${report.passphrasePresent ? 'yes' : 'NO'}`)
      consola.info(`Directory exists: ${report.keysDirExists ? 'yes' : 'NO'}`)
      if (report.keysDirMode !== null) {
        const mode = report.keysDirMode.toString(8).padStart(4, '0')
        consola.info(`Directory mode: 0${mode}`)
      }
      if (report.fileIssues.length === 0) {
        consola.success('All key files look healthy.')
      } else {
        consola.error(`${report.fileIssues.length} file issue(s):`)
        for (const issue of report.fileIssues) {
          consola.error(`  ${issue.issue} – ${issue.path}`)
        }
        process.exit(1)
      }
      if (!report.passphrasePresent) {
        consola.error('Master passphrase is missing. Run `lf keys init`.')
        process.exit(1)
      }
    } catch (err) {
      reportError(err)
    }
  },
})

// ─── lf keys ────────────────────────────────────────────────────────────────

const keys = defineCommand({
  meta: {
    name: 'keys',
    description: 'Manage local BYOK API keys stored in ~/.lenserfight/keys/.',
  },
  subCommands: {
    init: keysInit,
    list: keysList,
    add: keysAdd,
    update: keysUpdate,
    rotate: keysRotate,
    remove: keysRemove,
    export: keysExport,
    doctor: keysDoctor,
  },
})

export default keys
