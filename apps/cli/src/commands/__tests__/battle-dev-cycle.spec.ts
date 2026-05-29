// Phase BL — unit coverage for `lf battle dev-cycle`.
export {}

jest.mock('citty', () => ({ defineCommand: (opts: unknown) => opts }))
jest.mock('consola', () => ({
  __esModule: true,
  default: {
    error:   jest.fn(),
    warn:    jest.fn(),
    info:    jest.fn(),
    start:   jest.fn(),
    success: jest.fn(),
    log:     jest.fn(),
    box:     jest.fn(),
  },
}))
jest.mock('../../utils/api', () => ({
  callRpc:     jest.fn(),
  callRest:    jest.fn(),
  handleError: jest.fn(),
}))
jest.mock('../../utils/output', () => ({
  printTable: jest.fn(),
  printJson:  jest.fn(),
  truncate:   (s: string, n: number) => (s.length > n ? s.slice(0, n) + '…' : s),
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCmd = { run?: (ctx: any) => Promise<void>; subCommands?: Record<string, any> }

async function getDevCycle(): Promise<AnyCmd> {
  const { default: battleCmd } = (await import('../battle')) as { default: AnyCmd }
  return battleCmd.subCommands?.['dev-cycle'] as AnyCmd
}

beforeEach(() => {
  jest.clearAllMocks()
  process.exitCode = 0
})

afterEach(() => {
  delete process.env['SUPABASE_URL']
})

describe('lf battle dev-cycle', () => {
  it('--dry-run prints the step plan and exits without spawning', async () => {
    process.env['SUPABASE_URL'] = 'http://127.0.0.1:54321'

    const dev = await getDevCycle()
    await dev.run?.({
      args: {
        template: 'e2e-default',
        contenders: '2',
        'submit-text': '',
        'vote-for': 'A',
        'dry-run': true,
        json: false,
      },
    })

    // dry-run path returns after printing the plan; exitCode stays 0.
    expect(process.exitCode).toBe(0)
  })

  it('refuses non-local SUPABASE_URL (exit code 2)', async () => {
    process.env['SUPABASE_URL'] = 'https://prod.supabase.co'
    const dev = await getDevCycle()
    await dev.run?.({
      args: {
        template: 'e2e-default',
        contenders: '2',
        'submit-text': '',
        'vote-for': 'A',
        'dry-run': false,
        json: false,
      },
    })
    expect(process.exitCode).toBe(2)
  })

  it('--dry-run is honoured even with non-local SUPABASE_URL', async () => {
    process.env['SUPABASE_URL'] = 'https://prod.supabase.co'
    const dev = await getDevCycle()
    await dev.run?.({
      args: {
        template: 'e2e-default',
        contenders: '2',
        'submit-text': '',
        'vote-for': 'A',
        'dry-run': true,
        json: false,
      },
    })
    // dry-run returns before setting exitCode to 2
    expect(process.exitCode).toBe(0)
  })
})
