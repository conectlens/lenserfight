import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'
import { generateEd25519Keypair } from '@lenserfight/utils/signing'

import { resolveGatewayConfig } from './config'

/**
 * `lf-gateway-init` — first-run bootstrapper.
 *
 * 1. Generate an Ed25519 keypair.
 * 2. Persist the private key to the OS keychain.
 * 3. Persist non-secret bootstrap state (public key, generated_at) to
 *    `~/.lenserfight/gateway/identity.json` (mode 0600).
 *
 * Device registration against Supabase (`fn_device_register_with_key`) is a
 * follow-up step the CLI handles via `lf gateway approve-device` and the
 * daemon emits the corresponding heartbeat envelope on first start.
 */
async function main(): Promise<void> {
  const config = resolveGatewayConfig()
  const { publicKey, privateKey } = generateEd25519Keypair()

  await keychain.setSecret({
    service: config.keychainService,
    account: 'device:active',
    secret: privateKey,
  })

  await mkdir(config.stateDir, { recursive: true, mode: 0o700 })
  await writeFile(
    path.join(config.stateDir, 'identity.json'),
    JSON.stringify(
      {
        public_key: publicKey,
        signing_algo: 'ed25519',
        generated_at: new Date().toISOString(),
        daemon_version: config.daemonVersion,
      },
      null,
      2
    ),
    { mode: 0o600 }
  )

  process.stdout.write(
    `[lf-gateway-init] generated Ed25519 keypair.\n` +
      `  public_key: ${publicKey}\n` +
      `  state_dir:  ${config.stateDir}\n` +
      `Next step: authenticate the CLI, then register this public key with the cloud via the device identity RPC.\n` +
      `Until the registration command is promoted from preview, inspect the key with:\n` +
      `  lf gateway identity export-public\n`
  )
}

main().catch((err) => {
  process.stderr.write(`[lf-gateway-init] fatal: ${(err as Error).message}\n`)
  process.exit(1)
})
