import { LocalKeysGatewayClient, GatewayPairingStore } from '@lenserfight/data/local-keys-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { LocalKeyMeta } from '@lenserfight/types'

/**
 * Local BYOK keys now live in `~/.lenserfight/keys/` on the user's machine,
 * accessed over the loopback gateway daemon (`apps/gateway`). The browser
 * holds NO ciphertext, NO IV, and NO plaintext beyond a single in-flight
 * `resolveKey()` call.
 *
 * Pairing is durable: after the user pairs once, the credential is stored in
 * IndexedDB with a 30-day rolling TTL and gateway-identity fingerprint. New
 * tabs and page reloads attempt auto-reconnect from IndexedDB — no re-paste
 * required unless the pairing expires, is revoked, or the gateway changes.
 */

export type LocalKeyAvailabilityReason =
  | 'available'
  | 'gateway_unreachable'
  | 'gateway_not_paired'
  | 'gateway_forbidden'
  /** Auto-reconnect from IndexedDB is in progress. Transient (~100–300 ms). */
  | 'pairing_connecting'
  /**
   * A stored pairing was found but the TTL has elapsed (30-day inactivity) or
   * the gateway's identity fingerprint has changed (daemon reinstalled).
   * Re-pairing is required.
   */
  | 'pairing_expired'
  /**
   * The gateway rejected the stored token (HTTP 401), typically because
   * `lf gateway pair --rotate` was run. The stored credential has been
   * deleted. Re-pairing is required.
   */
  | 'pairing_revoked'

export interface UseLocalKeyStore {
  localKeys: LocalKeyMeta[]
  isLoading: boolean
  availability: LocalKeyAvailabilityReason
  /** Add a new local key via the gateway. */
  addKey: (provider: string, label: string, rawKey: string) => Promise<void>
  removeKey: (id: string) => Promise<void>
  /** Replace the plaintext value and/or label for an existing key. */
  updateKey: (id: string, rawKey: string, label: string) => Promise<void>
  /** Resolve plaintext for a single use. Caller must drop the reference immediately. */
  resolveKey: (id: string) => Promise<string>
  /** Store the gateway pairing token (from `lf gateway pair`) and persist to IDB. */
  pairGateway: (token: string) => void
  /** Clear the in-session token only (does not clear IndexedDB pairing). */
  unpairGateway: () => void
  /**
   * Clear the stored pairing entirely — both in-memory and IndexedDB.
   * Called when the user clicks "Forget this gateway".
   */
  forgetGateway: () => Promise<void>
  /** Re-probe the gateway and refresh the key list. */
  refresh: () => Promise<void>
}

export function useLocalKeyStore(enabled = true): UseLocalKeyStore {
  const clientRef = useRef<LocalKeysGatewayClient | null>(null)
  if (!clientRef.current) {
    clientRef.current = new LocalKeysGatewayClient({
      pairingStore: new GatewayPairingStore(),
    })
  }
  const client = clientRef.current

  const [localKeys, setLocalKeys] = useState<LocalKeyMeta[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [availability, setAvailability] = useState<LocalKeyAvailabilityReason>('pairing_connecting')

  const refresh = useCallback(async () => {
    setIsLoading(true)
    const health = await client.healthCheck()
    if (!health.reachable) {
      setAvailability('gateway_unreachable')
      setLocalKeys([])
      setIsLoading(false)
      return
    }
    if (!health.paired) {
      setAvailability('gateway_not_paired')
      setLocalKeys([])
      setIsLoading(false)
      return
    }
    try {
      const keys = await client.list()
      setLocalKeys(keys)
      setAvailability('available')
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code === 'gateway_forbidden') setAvailability('gateway_forbidden')
      else if (code === 'pairing_revoked') setAvailability('pairing_revoked')
      else if (code === 'gateway_not_paired') setAvailability('gateway_not_paired')
      else setAvailability('gateway_unreachable')
      setLocalKeys([])
    } finally {
      setIsLoading(false)
    }
  }, [client])

  // On mount: attempt to restore the pairing from IndexedDB before probing the
  // gateway. This avoids the "gateway_not_paired" flash on every page load when
  // the user is already paired.
  //
  // Intentionally NOT including `refresh` in deps — this effect must run only
  // once per mount. Subsequent refreshes are triggered by pairGateway() and
  // explicit refresh() calls.
  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function init() {
      setAvailability('pairing_connecting')
      const reconnect = await client.reconnectFromStoredPairing()
      if (cancelled) return

      if (reconnect === 'expired') {
        setAvailability('pairing_expired')
        return
      }
      // 'loaded' or 'not_found' — run the full health + keys probe either way.
      // healthCheck() will auto-reconnect again if _memToken is set (no-op),
      // or surface the correct unreachable/not_paired state if it isn't.
      await refresh()
    }

    void init()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  const addKey = useCallback(
    async (provider: string, label: string, rawKey: string) => {
      await client.add({ provider, label, rawKey })
      await refresh()
    },
    [client, refresh]
  )

  const removeKey = useCallback(
    async (id: string) => {
      await client.remove(id)
      setLocalKeys((prev) => prev.filter((k) => k.id !== id))
    },
    [client]
  )

  const updateKey = useCallback(
    async (id: string, rawKey: string, label: string) => {
      await client.update({ id, rawKey, label })
      await refresh()
    },
    [client, refresh]
  )

  const resolveKey = useCallback(
    async (id: string): Promise<string> => {
      return client.resolve(id)
    },
    [client]
  )

  const pairGateway = useCallback(
    (token: string) => {
      const trimmed = token.trim()
      // Minimum-viability check: non-empty, at least 16 printable ASCII chars,
      // no whitespace. The gateway issues 256-bit random tokens so anything
      // shorter or containing whitespace/control chars is not a valid token.
      if (trimmed.length < 16 || !/^[\x21-\x7E]+$/.test(trimmed)) return
      client.setToken(trimmed)
      // Persist the credential to IndexedDB asynchronously. Fire-and-forget is
      // acceptable — the in-memory token is already active for this session.
      void client.persistPairing()
      void refresh()
    },
    [client, refresh]
  )

  const unpairGateway = useCallback(() => {
    client.clearToken()
    setAvailability('gateway_not_paired')
    setLocalKeys([])
  }, [client])

  const forgetGateway = useCallback(async () => {
    await client.forgetGateway()
    setAvailability('gateway_not_paired')
    setLocalKeys([])
  }, [client])

  return {
    localKeys,
    isLoading,
    availability,
    addKey,
    removeKey,
    updateKey,
    resolveKey,
    pairGateway,
    unpairGateway,
    forgetGateway,
    refresh,
  }
}
