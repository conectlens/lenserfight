import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  getLegacyProjectLocalBattleDir,
  getLocalBattleRuntimeDir,
  getLocalBattleStorageDirs,
} from './local-battle-paths'

describe('local battle path resolution', () => {
  const originalRuntimeDir = process.env.LENSERFIGHT_RUNTIME_DIR

  afterEach(() => {
    if (originalRuntimeDir === undefined) delete process.env.LENSERFIGHT_RUNTIME_DIR
    else process.env.LENSERFIGHT_RUNTIME_DIR = originalRuntimeDir
  })

  it('stores new local battle runtime state outside the project root by default override', () => {
    const runtimeRoot = join(tmpdir(), 'lf-runtime-test')
    process.env.LENSERFIGHT_RUNTIME_DIR = runtimeRoot

    expect(getLocalBattleRuntimeDir()).toBe(join(runtimeRoot, 'local-battles'))
  })

  it('keeps the project .lenserfight/local-battles path as a legacy read boundary', () => {
    const projectRoot = join(tmpdir(), 'lf-project-test')
    const runtimeRoot = join(tmpdir(), 'lf-runtime-test')
    process.env.LENSERFIGHT_RUNTIME_DIR = runtimeRoot

    expect(getLegacyProjectLocalBattleDir(projectRoot)).toBe(
      join(projectRoot, '.lenserfight', 'local-battles')
    )
    expect(getLocalBattleStorageDirs(projectRoot)).toEqual({
      primary: join(runtimeRoot, 'local-battles'),
      legacy: join(projectRoot, '.lenserfight', 'local-battles'),
    })
  })
})
