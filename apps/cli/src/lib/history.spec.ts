import { promises as fsp } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

jest.mock('@lenserfight/cli-client', () => {
  const actual = jest.requireActual('@lenserfight/cli-client')
  return { ...actual, getDeviceConfigDir: () => (globalThis as unknown as { __testConfigDir: string }).__testConfigDir }
})

import { appendHistory, loadHistory } from './history'

describe('history persistence', () => {
  let dir: string

  beforeEach(async () => {
    dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'lf-history-'))
    ;(globalThis as unknown as { __testConfigDir: string }).__testConfigDir = dir
  })

  afterEach(async () => {
    await fsp.rm(dir, { recursive: true, force: true })
  })

  it('returns an empty history when no file exists yet', async () => {
    expect(await loadHistory()).toEqual([])
  })

  it('appends and reloads entries in order', async () => {
    await appendHistory('agents list')
    await appendHistory('battle create')
    expect(await loadHistory()).toEqual(['agents list', 'battle create'])
  })

  it('ignores blank entries', async () => {
    await appendHistory('   ')
    expect(await loadHistory()).toEqual([])
  })

  it('collapses embedded newlines into a single line', async () => {
    await appendHistory('agents list\nagents get')
    expect(await loadHistory()).toEqual(['agents list agents get'])
  })
})
