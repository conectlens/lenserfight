import { echoAdapter } from '../echo.provider'

describe('echoAdapter', () => {
  it('returns completed status', async () => {
    const result = await echoAdapter.generate('', '', 'hello echo', {})
    expect(result.status).toBe('completed')
  })

  it('makes no fetch calls', async () => {
    const spy = jest.spyOn(global, 'fetch')
    await echoAdapter.generate('', '', 'no fetch', {})
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('returns text/plain mimeType', async () => {
    const result = await echoAdapter.generate('', '', 'test', {})
    expect(result.mimeType).toBe('text/plain')
  })
})
