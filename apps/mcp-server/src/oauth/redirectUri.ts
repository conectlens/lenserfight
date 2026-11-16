/**
 * Redirect URI policy for dynamically registered OAuth clients.
 *
 * The consent page navigates the browser to the registered redirect URI after
 * authorization, so a registration must never carry a scheme that executes or
 * embeds content. Accepted: https, http on loopback (native/CLI clients), and
 * app-specific custom schemes (desktop clients such as `cursor://`).
 */

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const BLOCKED_SCHEMES = new Set([
  'javascript:', 'data:', 'vbscript:', 'blob:', 'file:', 'about:', 'ftp:', 'ws:', 'wss:',
]);

export function isAllowedRedirectUri(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false; // RFC 6749 3.1.2: no fragment
  if (url.protocol === 'https:') return true;
  if (url.protocol === 'http:') return LOOPBACK_HOSTS.has(url.hostname);
  if (BLOCKED_SCHEMES.has(url.protocol)) return false;
  return /^[a-z][a-z0-9+.-]*:$/.test(url.protocol);
}
