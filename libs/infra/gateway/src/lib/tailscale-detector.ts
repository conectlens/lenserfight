import { networkInterfaces } from 'node:os'

/**
 * Detect Tailscale (or any other private-network) interfaces on the host.
 *
 * v1 heuristic:
 *   - Address is an IPv4 in CGNAT range `100.64.0.0/10`.
 *   - Interface name starts with `tailscale`, `ts`, or `wg` on common OSes.
 *
 * Returns the list of qualifying interface names + addresses. Empty array
 * means no Tailscale-style interface is present, which is a hard requirement
 * for `lf gateway serve --tailscale` to succeed.
 */

export interface TailscaleInterface {
  name: string
  address: string
  cidr: string | null
  family: 'IPv4' | 'IPv6'
}

export function detectTailscaleInterfaces(): TailscaleInterface[] {
  const interfaces = networkInterfaces()
  const out: TailscaleInterface[] = []
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue
    for (const a of addrs) {
      if (a.internal) continue
      if (a.family !== 'IPv4') continue
      if (!isCgnatV4(a.address)) continue
      if (!looksLikeTailscale(name)) continue
      out.push({
        name,
        address: a.address,
        cidr: a.cidr ?? null,
        family: a.family,
      })
    }
  }
  return out
}

/**
 * RFC 6598 Carrier-Grade NAT range: 100.64.0.0/10.
 */
export function isCgnatV4(addr: string): boolean {
  const parts = addr.split('.').map((p) => Number.parseInt(p, 10))
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return false
  if (parts[0] !== 100) return false
  return parts[1] >= 64 && parts[1] <= 127
}

function looksLikeTailscale(ifaceName: string): boolean {
  const n = ifaceName.toLowerCase()
  if (n.startsWith('tailscale')) return true
  if (n.startsWith('ts')) return true
  if (n.startsWith('wg')) return true
  if (n === 'utun' || n.startsWith('utun')) return true
  return false
}
