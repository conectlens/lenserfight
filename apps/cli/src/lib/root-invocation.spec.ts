import { resolveRootInvocation } from './root-invocation'

describe('resolveRootInvocation', () => {
  it('launches the dashboard for a bare `lf`', () => {
    expect(resolveRootInvocation([])).toEqual({ launchDashboard: true })
  })

  it('launches the dashboard for flag-only invocations instead of exiting silently', () => {
    // Regression: `lf --local` used to fall through both branches and no-op.
    expect(resolveRootInvocation(['--local']).launchDashboard).toBe(true)
    expect(resolveRootInvocation(['--debug', '--cloud']).launchDashboard).toBe(true)
  })

  it('defers to citty when a subcommand token is present', () => {
    expect(resolveRootInvocation(['battle', 'list']).launchDashboard).toBe(false)
    expect(resolveRootInvocation(['--local', 'status']).launchDashboard).toBe(false)
  })
})
