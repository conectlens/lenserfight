jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('../utils/output', () => ({
  printJson: jest.fn(),
  printSuccess: jest.fn(),
  printWarn: jest.fn(),
}))
jest.mock('../config/project-config', () => ({
  loadConfig: jest.fn(),
  loadUserConfig: jest.fn(),
  saveConfig: jest.fn(),
  saveUserConfig: jest.fn(),
}))
// sub-command imports also use defineCommand
jest.mock('./config-local-battle-key', () => ({ default: { meta: { name: 'local-battle-key' } } }))
jest.mock('./config-webhook-secret', () => ({ default: { meta: { name: 'webhook-secret' } } }))
jest.mock('node:fs', () => ({ readFileSync: jest.fn(), writeFileSync: jest.fn() }))
jest.mock('../utils/api', () => ({ handleError: jest.fn() }))

import { loadConfig } from '../config/project-config'
import { printJson, printSuccess, printWarn } from '../utils/output'
import { handleError } from '../utils/api'

const mockLoadConfig = loadConfig as jest.MockedFunction<typeof loadConfig>
const mockPrintJson = printJson as jest.MockedFunction<typeof printJson>
const mockPrintSuccess = printSuccess as jest.MockedFunction<typeof printSuccess>
const mockPrintWarn = printWarn as jest.MockedFunction<typeof printWarn>
const mockHandleError = handleError as jest.MockedFunction<typeof handleError>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { subCommands?: Record<string, AnyCmd>; run?: (ctx: any) => Promise<void> }

let configCmd: AnyCmd

beforeAll(async () => {
  configCmd = (await import('./config')).default as AnyCmd
})

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

describe('config validate', () => {
  let validateCmd: AnyCmd

  beforeAll(() => {
    validateCmd = configCmd.subCommands?.validate as AnyCmd
  })

  it('prints success when config is valid', async () => {
    // Provide a minimal valid config that satisfies the AJV schema
    mockLoadConfig.mockReturnValue({
      mode: 'local',
      dbPort: 54322,
      apiPort: 3000,
    } as never)

    await validateCmd?.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintSuccess).toHaveBeenCalledWith(expect.stringContaining('valid'))
    expect(process.exitCode).not.toBe(1)
  })

  it('outputs JSON with valid=true for a valid config', async () => {
    mockLoadConfig.mockReturnValue({ mode: 'local', dbPort: 54322, apiPort: 3000 } as never)

    await validateCmd?.run?.({ args: { json: true }, cmd: {}, rawArgs: [] })

    expect(mockPrintJson).toHaveBeenCalledWith(
      expect.objectContaining({ valid: true }),
    )
  })

  it('sets exitCode=1 and prints warn when config is invalid', async () => {
    // Missing required fields
    mockLoadConfig.mockReturnValue({ mode: 'cloud' } as never)

    await validateCmd?.run?.({ args: { json: false }, cmd: {}, rawArgs: [] })

    expect(mockPrintWarn).toHaveBeenCalled()
    expect(process.exitCode).toBe(1)
  })

  it('routes a thrown loadConfig error to handleError instead of rejecting', async () => {
    const boom = new Error('config file unreadable')
    mockLoadConfig.mockImplementation(() => { throw boom })

    await expect(
      validateCmd?.run?.({ args: { json: false }, cmd: {}, rawArgs: [] }),
    ).resolves.not.toThrow()

    expect(mockHandleError).toHaveBeenCalledWith(boom)
  })
})
