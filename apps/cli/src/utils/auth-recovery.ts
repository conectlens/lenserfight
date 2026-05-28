import { loadUserConfig, resolveConfig, saveUserConfig } from '../config/project-config'
import { isCI, isInteractiveTTY } from '../lib/safety/env-inspector'
import {
  buildAuthAppUrl,
  openBrowser,
  requestDeviceLogin,
  waitForSessionLogin,
} from './auth'

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'
const GREEN = '\x1b[32m'
const CYAN = '\x1b[36m'
const RED = '\x1b[31m'

let recoveryInProgress = false

function canOpenBrowser(): boolean {
  if (process.platform === 'win32' || process.platform === 'darwin') return true
  return !!(
    process.env['DISPLAY'] ||
    process.env['WAYLAND_DISPLAY'] ||
    process.env['XDG_CURRENT_DESKTOP']
  )
}

async function trySilentRefresh(): Promise<boolean> {
  const user = loadUserConfig()
  if (!user.authRefreshToken) return false

  const config = resolveConfig()
  if (!config.supabaseUrl || !config.supabaseAnonKey) return false

  try {
    const res = await fetch(
      `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: config.supabaseAnonKey,
        },
        body: JSON.stringify({ refresh_token: user.authRefreshToken }),
      }
    )

    if (!res.ok) return false

    const data = await res.json()
    saveUserConfig({
      authToken: data.access_token,
      authRefreshToken: data.refresh_token,
      authExpiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    return true
  } catch {
    return false
  }
}

async function runBrowserLoginFlow(): Promise<boolean> {
  process.stderr.write(
    `\n${CYAN}${BOLD}  Authentication required${RESET}\n` +
    `${DIM}  No active session found. Starting browser login...${RESET}\n\n`
  )

  let request: Awaited<ReturnType<typeof requestDeviceLogin>>
  try {
    request = await requestDeviceLogin()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    process.stderr.write(`  ${RED}✗${RESET}  Could not initiate login: ${msg}\n\n`)
    return false
  }

  const loginUrl = buildAuthAppUrl(request.verificationUri)

  if (canOpenBrowser()) {
    openBrowser(loginUrl)
    process.stderr.write(`${DIM}  Browser opened.${RESET}\n`)
  }

  process.stderr.write(
    `  Approval code:  ${BOLD}${request.userCode}${RESET}\n` +
    `  ${DIM}URL: ${CYAN}${loginUrl}${RESET}\n\n`
  )

  const spinFrames = ['⠋', '⠙', '⠸', '⠴', '⠦', '⠇']
  let spinIdx = 0
  const spin = setInterval(() => {
    const frame = spinFrames[spinIdx++ % spinFrames.length]
    process.stderr.write(`\r  ${CYAN}${frame}${RESET}  Waiting for browser approval...  `)
  }, 120)

  try {
    await waitForSessionLogin(request)
    clearInterval(spin)
    process.stderr.write(
      `\r  ${GREEN}✓${RESET}  Authenticated. Resuming command...${' '.repeat(20)}\n\n`
    )
    return true
  } catch {
    clearInterval(spin)
    process.stderr.write(
      `\r  ${RED}✗${RESET}  Login cancelled or timed out.${' '.repeat(20)}\n\n`
    )
    return false
  }
}

/**
 * Intercepts an auth failure and attempts contextual recovery without disrupting
 * the developer's workflow. Strategy order:
 *
 *   1. Silent token refresh  — zero UX; transparent if it works.
 *   2. Browser device-login  — auto-opens browser, shows approval code, resumes.
 *   3. CI / non-TTY fallback — prints actionable hint and returns false immediately.
 *
 * Returns true if a valid session was established so the caller can retry the
 * original operation. Returns false if recovery is impossible or was declined.
 */
export async function attemptAuthRecovery(): Promise<boolean> {
  if (recoveryInProgress) return false
  recoveryInProgress = true

  try {
    // 1. Silent refresh — invisible to the user when it succeeds.
    if (await trySilentRefresh()) return true

    // 2. CI or non-interactive shell — cannot prompt; fail with an actionable hint.
    if (isCI() || !isInteractiveTTY()) {
      process.stderr.write(
        `\n${RED}${BOLD}  Authentication required${RESET}\n` +
        `${DIM}  Set LF_API_KEY or run \`lf auth login\` on an interactive terminal.${RESET}\n\n`
      )
      return false
    }

    // 3. Interactive terminal — full browser-based device-login flow.
    return await runBrowserLoginFlow()
  } finally {
    recoveryInProgress = false
  }
}
