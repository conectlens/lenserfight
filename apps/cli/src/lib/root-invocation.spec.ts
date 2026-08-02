import { resolveRootInvocation } from './root-invocation'

describe('resolveRootInvocation', () => {
  it('launches assist for a bare `lf`', () => {
    expect(resolveRootInvocation([])).toEqual({
      launchAssist: true,
      force: false,
      passthroughArgs: [],
    })
  })

  it('launches assist for flag-only invocations instead of exiting silently', () => {
    // Regression: `lf --force` used to fall through both branches and no-op.
    expect(resolveRootInvocation(['--force'])).toEqual({
      launchAssist: true,
      force: true,
      passthroughArgs: [],
    })
    expect(resolveRootInvocation(['--local']).launchAssist).toBe(true)
    expect(resolveRootInvocation(['--debug', '--cloud']).launchAssist).toBe(true)
  })

  it('strips root-owned flags but forwards the rest to the assist runtime', () => {
    expect(resolveRootInvocation(['--local', '--model', '--debug'])).toEqual({
      launchAssist: true,
      force: false,
      passthroughArgs: ['--model'],
    })
  })

  it('defers to citty when a subcommand token is present', () => {
    expect(resolveRootInvocation(['battle', 'list']).launchAssist).toBe(false)
    expect(resolveRootInvocation(['--local', 'status']).launchAssist).toBe(false)
  })
})
