import { existsSync, readFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { keychain } from '@lenserfight/utils/keychain'
import { defaultPassphraseProvider } from '@lenserfight/data/local-keys'

import type { GatewayConfig } from './config'

export interface GatewayPreconditionProbes {
  checkClockSkew: () => Promise<{ ok: boolean; skewSeconds: number }>
  checkKeychainPresent: () => Promise<boolean>
  checkKeysPassphrase: () => Promise<boolean>
  checkIdentityPresent: () => Promise<boolean>
  checkSessionPresent: () => Promise<boolean>
  checkLenserActive: () => Promise<boolean>
  checkKillSwitch: () => Promise<boolean>
}

export function createGatewayPreconditionProbes(config: GatewayConfig): GatewayPreconditionProbes {
  return {
    checkClockSkew: async () => {
      // Offline-safe lower bound. Online skew validation is covered by
      // `lf gateway doctor --check clock`; the daemon must still be able to
      // perform deterministic local refusal checks before network access.
      return { ok: true, skewSeconds: 0 }
    },
    checkKeychainPresent: async () => {
      try {
        await keychain.getBackend()
        return true
      } catch {
        return false
      }
    },
    checkKeysPassphrase: async () => {
      try {
        return await defaultPassphraseProvider.isConfigured()
      } catch {
        return false
      }
    },
    checkIdentityPresent: async () => {
      try {
        const secret = await keychain.getSecret({
          service: config.keychainService,
          account: 'device:active',
        })
        if (!secret) return false
        const identityFile = path.join(config.stateDir, 'identity.json')
        if (!existsSync(identityFile)) return false
        const identity = JSON.parse(readFileSync(identityFile, 'utf-8')) as {
          public_key?: string
          signing_algo?: string
        }
        return Boolean(identity.public_key && identity.signing_algo === 'ed25519')
      } catch {
        return false
      }
    },
    checkSessionPresent: async () => hasSessionMaterial(),
    checkLenserActive: async () => process.env['LF_GATEWAY_OWNER_PAUSED'] !== '1',
    checkKillSwitch: async () => process.env['LF_GATEWAY_GLOBAL_KILL_SWITCH'] === '1',
  }
}

function hasSessionMaterial(): boolean {
  if (process.env['LENSERFIGHT_API_KEY']) return true
  if (process.env['SUPABASE_ACCESS_TOKEN']) return true
  if (process.env['LF_ACCESS_TOKEN']) return true

  const userConfig = readJsonFile(path.join(os.homedir(), '.lenserfight', 'config.json'))
  if (typeof userConfig?.authToken === 'string' && userConfig.authToken.length > 0) return true
  if (typeof userConfig?.apiKey === 'string' && userConfig.apiKey.length > 0) return true

  const activeProfile = readActiveProfileName()
  if (!activeProfile) return false
  const profile = readJsonFile(path.join(os.homedir(), '.lenserfight', 'profiles', `${activeProfile}.json`))
  return typeof profile?.access_token === 'string' && profile.access_token.length > 0
}

function readActiveProfileName(): string | null {
  const envProfile = process.env['LF_PROFILE']
  if (envProfile) return envProfile
  const activeFile = path.join(os.homedir(), '.lenserfight', 'profiles', '.active')
  if (!existsSync(activeFile)) return null
  try {
    const raw = readFileSync(activeFile, 'utf-8').trim()
    return raw || null
  } catch {
    return null
  }
}

function readJsonFile(file: string): Record<string, unknown> | null {
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as Record<string, unknown>
  } catch {
    return null
  }
}
