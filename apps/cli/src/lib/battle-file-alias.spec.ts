import consola from 'consola'
import {
  warnBattleLocalAlias,
  wrapBattleLocalAliasCommand,
  _resetBattleLocalAliasWarnForTest,
} from './battle-file-alias'

jest.mock('consola', () => ({
  __esModule: true,
  default: { warn: jest.fn() },
}))

const consolaWarn = (consola as unknown as { warn: jest.Mock }).warn

describe('battle-file-alias', () => {
  beforeEach(() => {
    _resetBattleLocalAliasWarnForTest()
    consolaWarn.mockClear()
  })

  it('warns once when alias wrapper runs', async () => {
    const inner = { async run() {} }
    const wrapped = wrapBattleLocalAliasCommand(inner)
    await wrapped.run?.()
    await wrapped.run?.()
    expect(consolaWarn).toHaveBeenCalledTimes(1)
    expect(consolaWarn).toHaveBeenCalledWith(expect.stringContaining('battle file'))
  })

  it('warnBattleLocalAlias is idempotent', () => {
    warnBattleLocalAlias()
    warnBattleLocalAlias()
    expect(consolaWarn).toHaveBeenCalledTimes(1)
  })
})
