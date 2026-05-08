import { mkdirSync, rmSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import {
  readBattleFile,
  writeBattleFile,
  __resetLocalBattleKeyCacheForTests,
} from './local-battle-storage'

const TEST_DIR = join(tmpdir(), `lf-storage-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)

const originalKey = process.env.LENSERFIGHT_LOCAL_BATTLE_KEY

beforeAll(() => {
  mkdirSync(TEST_DIR, { recursive: true })
})

afterAll(() => {
  if (originalKey === undefined) delete process.env.LENSERFIGHT_LOCAL_BATTLE_KEY
  else process.env.LENSERFIGHT_LOCAL_BATTLE_KEY = originalKey
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
})

beforeEach(() => {
  process.env.LENSERFIGHT_LOCAL_BATTLE_KEY = 'unit-test-passphrase-deadbeef'
  __resetLocalBattleKeyCacheForTests()
})

describe('local-battle-storage round-trip', () => {
  it('writes an envelope and reads back the original payload', () => {
    const path = join(TEST_DIR, 'roundtrip.json')
    const payload = { id: 'b1', name: 'Test', votes: [{ slot: 'A' }] }

    writeBattleFile(path, payload)

    const onDisk = JSON.parse(readFileSync(path, 'utf-8'))
    expect(onDisk).toMatchObject({ v: 1, alg: 'aes-256-gcm' })
    expect(typeof onDisk.data).toBe('string')

    const restored = readBattleFile<typeof payload>(path)
    expect(restored).toEqual(payload)
  })

  it('produces a different ciphertext on every write (random IV)', () => {
    const p1 = join(TEST_DIR, 'iv-a.json')
    const p2 = join(TEST_DIR, 'iv-b.json')
    writeBattleFile(p1, { x: 1 })
    writeBattleFile(p2, { x: 1 })
    const a = JSON.parse(readFileSync(p1, 'utf-8')).data
    const b = JSON.parse(readFileSync(p2, 'utf-8')).data
    expect(a).not.toBe(b)
  })
})

describe('local-battle-storage missing key', () => {
  it('throws a clear error pointing to the config command on encrypted read', () => {
    const path = join(TEST_DIR, 'no-key.json')
    writeBattleFile(path, { id: 'x' })

    delete process.env.LENSERFIGHT_LOCAL_BATTLE_KEY
    __resetLocalBattleKeyCacheForTests()

    expect(() => readBattleFile(path)).toThrow(/lf config local-battle-key generate/)
  })
})

describe('local-battle-storage legacy migration', () => {
  it('reads a legacy plaintext file and re-writes it under the encrypted envelope', () => {
    const path = join(TEST_DIR, 'legacy.json')
    const payload = { id: 'legacy-1', votes: [] }
    writeFileSync(path, JSON.stringify(payload, null, 2), 'utf-8')

    const restored = readBattleFile<typeof payload>(path)
    expect(restored).toEqual(payload)

    // After read, the file on disk should now be an encrypted envelope.
    const onDisk = JSON.parse(readFileSync(path, 'utf-8'))
    expect(onDisk).toMatchObject({ v: 1, alg: 'aes-256-gcm' })
    expect(typeof onDisk.data).toBe('string')

    // And reading it back again should still yield the same payload.
    const second = readBattleFile<typeof payload>(path)
    expect(second).toEqual(payload)
  })
})
