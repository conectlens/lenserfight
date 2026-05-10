import { defineCommand } from 'citty'
import consola from 'consola'
import { randomBytes } from 'node:crypto'

const ENV_VAR = 'LENSERFIGHT_LOCAL_BATTLE_KEY'

const generate = defineCommand({
  meta: {
    name: 'generate',
    description:
      'Generate a fresh 32-byte random hex passphrase for local battle file encryption.',
  },
  async run() {
    const key = randomBytes(32).toString('hex')
    // Print the raw key on stdout so it can be piped/captured.
    // Instructions go to stderr via consola so they don't pollute the value.
    consola.log(key)
    consola.info('')
    consola.info('Set this in your shell profile to enable encrypted local battles:')
    consola.info('  export %s=%s', ENV_VAR, key)
    consola.info('')
    consola.warn(
      'Treat this as a secret. Anyone with this value can decrypt your local battle state files.'
    )
  },
})

const verify = defineCommand({
  meta: {
    name: 'verify',
    description: 'Confirm that LENSERFIGHT_LOCAL_BATTLE_KEY is set and parses.',
  },
  async run() {
    const passphrase = process.env[ENV_VAR]
    if (!passphrase) {
      consola.error(
        '%s is not set. Generate one with: lf config local-battle-key generate',
        ENV_VAR
      )
      process.exitCode = 1
      return
    }
    if (passphrase.length < 16) {
      consola.warn(
        '%s is set but only %d characters — recommend 32+ for AES-256.',
        ENV_VAR,
        passphrase.length
      )
    }
    consola.success('OK')
  },
})

export default defineCommand({
  meta: {
    name: 'local-battle-key',
    description:
      'Generate or verify the passphrase used to encrypt local battle state files.',
  },
  subCommands: {
    generate,
    verify,
  },
})
