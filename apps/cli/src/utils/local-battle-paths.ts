import { resolve } from 'node:path'

import { getDeviceConfigDir } from '../config/project-config'

export const LENSERFIGHT_RUNTIME_DIR_ENV = 'LENSERFIGHT_RUNTIME_DIR'
export const LOCAL_BATTLE_DIR_NAME = 'local-battles'
export const LEGACY_PROJECT_LOCAL_BATTLE_DIR = '.lenserfight/local-battles'

export function getLenserfightRuntimeDir(): string {
  return process.env[LENSERFIGHT_RUNTIME_DIR_ENV] || getDeviceConfigDir()
}

export function getLocalBattleRuntimeDir(): string {
  return resolve(getLenserfightRuntimeDir(), LOCAL_BATTLE_DIR_NAME)
}

export function getLegacyProjectLocalBattleDir(root = process.cwd()): string {
  return resolve(root, LEGACY_PROJECT_LOCAL_BATTLE_DIR)
}

export function getLocalBattleStorageDirs(root = process.cwd()): { primary: string; legacy: string } {
  return {
    primary: getLocalBattleRuntimeDir(),
    legacy: getLegacyProjectLocalBattleDir(root),
  }
}
