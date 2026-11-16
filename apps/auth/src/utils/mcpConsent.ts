// sessionStorage record of an "Allow" click for one authorization request, kept
// while the user is sent through onboarding. A link can carry auto_allow=1 but
// cannot write this record, so the record — not the query param — is what
// permits completing the authorization without showing the consent form again.
const CONSENT_KEY_PREFIX = 'mcp_oauth_consent:'

export function rememberConsent(id: string, mcpServerUrl: string): void {
  try {
    sessionStorage.setItem(`${CONSENT_KEY_PREFIX}${id}`, mcpServerUrl)
  } catch {
    // storage unavailable — the consent form is shown again on return
  }
}

/** Single use: the record is removed whether or not it matches. */
export function consumeConsent(id: string, mcpServerUrl: string): boolean {
  try {
    const key = `${CONSENT_KEY_PREFIX}${id}`
    const stored = sessionStorage.getItem(key)
    sessionStorage.removeItem(key)
    return stored === mcpServerUrl
  } catch {
    return false
  }
}
