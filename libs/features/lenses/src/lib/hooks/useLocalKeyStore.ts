import { useState, useEffect, useCallback } from 'react'
import type { LocalKeyMeta } from '@lenserfight/types'
import {
  encryptKey,
  decryptKey,
  saveLocalKey,
  getLocalKeys,
  getLocalKeyById,
  deleteLocalKey,
  updateLocalKey,
} from '../utils/localKeyCrypto'

export interface UseLocalKeyStore {
  localKeys: LocalKeyMeta[]
  isLoading: boolean
  /** Add a new encrypted local key. Pass rawKey='' for Ollama (no key needed). */
  addKey: (provider: string, label: string, rawKey: string) => Promise<void>
  removeKey: (id: string) => Promise<void>
  /** Replace the encrypted key and label for an existing entry. */
  updateKey: (id: string, rawKey: string, label: string) => Promise<void>
  /** Decrypt and return the raw key at execution time — never stored in state. */
  resolveKey: (id: string) => Promise<string>
}

function toMeta(keys: Awaited<ReturnType<typeof getLocalKeys>>): LocalKeyMeta[] {
  return keys.map(({ id, provider, label, createdAt }) => ({ id, provider, label, createdAt }))
}

export function useLocalKeyStore(): UseLocalKeyStore {
  const [localKeys, setLocalKeys] = useState<LocalKeyMeta[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getLocalKeys()
      .then((keys) => setLocalKeys(toMeta(keys)))
      .catch(() => {
        // IndexedDB unavailable (private browsing or security restriction) — silently fail
        setLocalKeys([])
      })
      .finally(() => setIsLoading(false))
  }, [])

  const addKey = useCallback(async (provider: string, label: string, rawKey: string) => {
    const { encryptedKey, iv } = await encryptKey(rawKey)
    await saveLocalKey({ provider, label, encryptedKey, iv })
    // Refresh
    const keys = await getLocalKeys()
    setLocalKeys(toMeta(keys))
  }, [])

  const removeKey = useCallback(async (id: string) => {
    await deleteLocalKey(id)
    setLocalKeys((prev) => prev.filter((k) => k.id !== id))
  }, [])

  const updateKey = useCallback(async (id: string, rawKey: string, label: string) => {
    await updateLocalKey(id, rawKey, label)
    const keys = await getLocalKeys()
    setLocalKeys(toMeta(keys))
  }, [])

  const resolveKey = useCallback(async (id: string): Promise<string> => {
    const entry = await getLocalKeyById(id)
    if (!entry) throw new Error(`Local key not found: ${id}`)
    return decryptKey(entry.encryptedKey, entry.iv)
  }, [])

  return { localKeys, isLoading, addKey, removeKey, updateKey, resolveKey }
}
