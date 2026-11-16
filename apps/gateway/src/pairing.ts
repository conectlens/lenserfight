import { randomBytes } from 'node:crypto'

import { keychain } from '@lenserfight/utils/keychain'

import { BEARER_KEYCHAIN_ACCOUNT, BEARER_KEYCHAIN_SERVICE } from './auth/bearer'

export interface PairingOutput {
  write(chunk: string): unknown
  isTTY?: boolean
}

export interface PairingBlockDeps {
  /** Returns the active pairing token, creating one when absent. */
  getToken?: () => Promise<string>
  stdout?: PairingOutput
}

async function defaultGetToken(): Promise<string> {
  let token = await keychain.getSecret({ service: BEARER_KEYCHAIN_SERVICE, account: BEARER_KEYCHAIN_ACCOUNT })
  if (!token) {
    token = randomBytes(32).toString('base64url')
    await keychain.setSecret({ service: BEARER_KEYCHAIN_SERVICE, account: BEARER_KEYCHAIN_ACCOUNT, secret: token })
  }
  return token
}

/**
 * Prints pairing instructions on daemon start. The token itself is shown only
 * on an interactive terminal: when stdout is a pipe, file, journal or container
 * log, the token would be copied into storage other principals can read, so a
 * pointer to `lf gateway pair` is printed instead.
 */
export async function printPairingBlock(gatewayUrl: string, deps: PairingBlockDeps = {}): Promise<void> {
  const getToken = deps.getToken ?? defaultGetToken
  const stdout: PairingOutput = deps.stdout ?? process.stdout
  const token = await getToken()

  const isTTY = stdout.isTTY
  if (!isTTY) {
    stdout.write(
      `[lf-gatewayd] Gateway ready at ${gatewayUrl}. Run \`lf gateway pair\` in a terminal to get the pairing token.\n`
    )
    return
  }
  const c = {
    reset:  isTTY ? '\x1b[0m'  : '',
    bold:   isTTY ? '\x1b[1m'  : '',
    cyan:   isTTY ? '\x1b[36m' : '',
    yellow: isTTY ? '\x1b[33m' : '',
    green:  isTTY ? '\x1b[32m' : '',
    dim:    isTTY ? '\x1b[2m'  : '',
  }

  const w = 64
  const line  = '─'.repeat(w)
  const out = stdout.write.bind(stdout)

  // Write a single box row. `visible` is the text as it will appear on screen
  // (no ANSI codes). `colored` is the same text with ANSI codes applied.
  // Padding is computed from the visible length so it is always non-negative.
  function row(visible: string, colored: string): void {
    const pad = ' '.repeat(Math.max(0, w - visible.length))
    out(`${c.cyan}│${c.reset}${colored}${pad}${c.cyan}│${c.reset}\n`)
  }

  out('\n')
  out(`${c.cyan}┌${line}┐${c.reset}\n`)
  row('', '')
  row('  Gateway ready — pair the web app in 3 steps',
      `  ${c.bold}Gateway ready — pair the web app in 3 steps${c.reset}`)
  row('', '')
  row('  Prerequisite: run `lf keys init` once (adds master passphrase).',
      `  ${c.yellow}Prerequisite: run \`lf keys init\` once (adds master passphrase).${c.reset}`)
  row('', '')
  row('  Step 1 — copy this token:',
      `  ${c.dim}Step 1 — copy this token:${c.reset}`)
  row('', '')

  // Token — wrap at w-2 so the indent + chunk always fits inside the border.
  const indent = '  '
  const maxChars = w - indent.length
  for (let i = 0; i < token.length; i += maxChars) {
    const chunk = token.slice(i, i + maxChars)
    row(`${indent}${chunk}`, `${indent}${c.green}${c.bold}${chunk}${c.reset}`)
  }

  row('', '')
  row('  Step 2 — open the web app → any Funding panel → Local Keys.',
      `  ${c.dim}Step 2 — open the web app → any Funding panel → Local Keys.${c.reset}`)
  row('', '')
  row('  Step 3 — paste the token into the "Pair gateway" box.',
      `  ${c.dim}Step 3 — paste the token into the "Pair gateway" box.${c.reset}`)
  row('', '')
  row(`  Gateway: ${gatewayUrl}`,
      `  ${c.yellow}Gateway: ${gatewayUrl}${c.reset}`)
  row('  Token is in sessionStorage — re-run `lf gateway pair` after',
      `  ${c.dim}Token is in sessionStorage — re-run \`lf gateway pair\` after${c.reset}`)
  row('  closing the tab, or `lf gateway pair --rotate` to invalidate.',
      `  ${c.dim}closing the tab, or \`lf gateway pair --rotate\` to invalidate.${c.reset}`)
  row('', '')
  out(`${c.cyan}└${line}┘${c.reset}\n`)
  out('\n')
}
