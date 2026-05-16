import { LocalKeysGatewayClient } from '@lenserfight/data/local-keys-browser'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { LocalKeyMeta } from '@lenserfight/types'

/**
 * Local BYOK keys now live in `~/.lenserfight/keys/` on the user's machine,
 * accessed over the loopback gateway daemon (`apps/gateway`). The browser
 * holds NO ciphertext, NO IV, and NO plaintext beyond a single in-flight
 * `resolveKey()` call. `lf keys add` is the only way to add a key.
 */

export type LocalKeyAvailabilityReason =
  | 'available'
  | 'gateway_unreachable'
  | 'gateway_not_paired'
  | 'gateway_forbidden'

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
  /** Store the gateway pairing token (from `lf gateway pair`). */
  pairGateway: (token: string) => void
  /** Clear the pairing token, returning the hook to the unpaired state. */
  unpairGateway: () => void
  /** Re-probe the gateway and refresh the key list. */
  refresh: () => Promise<void>
}

export function useLocalKeyStore(): UseLocalKeyStore {
  const clientRef = useRef<LocalKeysGatewayClient | null>(null)
  if (!clientRef.current) clientRef.current = new LocalKeysGatewayClient()
  const client = clientRef.current

  const [localKeys, setLocalKeys] = useState<LocalKeyMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availability, setAvailability] = useState<LocalKeyAvailabilityReason>('gateway_unreachable')

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
      else if (code === 'gateway_not_paired') setAvailability('gateway_not_paired')
      else setAvailability('gateway_unreachable')
      setLocalKeys([])
    } finally {
      setIsLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refresh()
  }, [refresh])

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
      client.setToken(token.trim())
      void refresh()
    },
    [client, refresh]
  )

  const unpairGateway = useCallback(() => {
    client.clearToken()
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
    refresh,
  }
}
