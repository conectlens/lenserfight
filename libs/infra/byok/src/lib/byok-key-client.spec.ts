import { describe, expect, it, vi } from 'vitest'
import { BYOKError, BYOKKeyClient, IdentityDecryptor, type ByokRpcClient } from './byok-key-client'

const client = (data: unknown, error: { message: string } | null = null): ByokRpcClient => ({
  rpc: vi.fn(async () => ({ data: data as never, error })) as unknown as ByokRpcClient['rpc'],
})

describe('BYOKKeyClient', () => {
  it('refuses to resolve without a reservation_id', async () => {
    const c = new BYOKKeyClient(client('ENC::secret'), new IdentityDecryptor())
    await expect(
      c.withKey({ agentId: 'a1', provider: 'openai', reservationId: '' }, async () => 'never'),
    ).rejects.toMatchObject({ code: 'E_BYOK_CONTEXT_MISSING' })
  })

  it('skips RPC entirely for the ollama provider (local, no key)', async () => {
    const rpc = client('should-not-be-used')
    const c = new BYOKKeyClient(rpc, new IdentityDecryptor())
    const out = await c.withKey(
      { agentId: 'a1', provider: 'ollama', reservationId: '' },
      async (k) => `key=[${k}]`,
    )
    expect(out).toBe('key=[]')
    expect(rpc.rpc).not.toHaveBeenCalled()
  })

  it('decrypts and exposes the plaintext only inside the body callback', async () => {
    const c = new BYOKKeyClient(client('ENC::sk_test'), new IdentityDecryptor())
    let seen = ''
    await c.withKey(
      { agentId: 'a1', provider: 'openai', reservationId: 'r1' },
      async (key) => {
        seen = key
        return null
      },
    )
    expect(seen).toBe('sk_test')
  })

  it('surfaces typed errors from the RPC layer', async () => {
    const c = new BYOKKeyClient(
      client(null, { message: 'E_BYOK_CONTEXT_EXPIRED: held_until passed' }),
      new IdentityDecryptor(),
    )
    await expect(
      c.withKey({ agentId: 'a1', provider: 'openai', reservationId: 'r1' }, async () => null),
    ).rejects.toBeInstanceOf(BYOKError)
  })

  it('raises E_BYOK_NO_KEY when no key is registered', async () => {
    const c = new BYOKKeyClient(client(null), new IdentityDecryptor())
    await expect(
      c.withKey({ agentId: 'a1', provider: 'openai', reservationId: 'r1' }, async () => null),
    ).rejects.toMatchObject({ code: 'E_BYOK_NO_KEY' })
  })
})
