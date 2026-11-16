import { describe, expect, it } from 'vitest'

import { printPairingBlock } from './pairing'

const TOKEN = 'secret-pairing-token-0123456789abcdefghij'

function capture(isTTY: boolean) {
  const chunks: string[] = []
  return {
    chunks,
    stdout: { isTTY, write: (c: string) => chunks.push(c) },
    text: () => chunks.join(''),
  }
}

describe('printPairingBlock', () => {
  it('does not write the token when stdout is not a TTY', async () => {
    const out = capture(false)
    await printPairingBlock('http://127.0.0.1:38080', { getToken: async () => TOKEN, stdout: out.stdout })
    expect(out.text()).not.toContain(TOKEN)
    expect(out.text()).toContain('lf gateway pair')
  })

  it('shows the token on an interactive terminal', async () => {
    const out = capture(true)
    await printPairingBlock('http://127.0.0.1:38080', { getToken: async () => TOKEN, stdout: out.stdout })
    expect(out.text()).toContain(TOKEN)
  })
})
