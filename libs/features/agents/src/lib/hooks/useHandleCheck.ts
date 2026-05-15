import { lenserService } from '@lenserfight/data/repositories'
import { useEffect, useRef, useState } from 'react'

/**
 * Debounced handle uniqueness checker shared by CreateAgentModal and
 * the onboarding agent creation step.
 *
 * Validates format and checks availability via lenserService.getLenserByHandle.
 * Returns mutable handle state alongside derived validation state.
 */
export const useHandleCheck = (minLength = 3) => {
  const [handle, setHandle] = useState('')
  const [isCheckingHandle, setIsCheckingHandle] = useState(false)
  const [isHandleUnique, setIsHandleUnique] = useState(false)
  const [handleError, setHandleError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const normalized = handle.trim().toLowerCase()

  useEffect(() => {
    setIsHandleUnique(false)
    setSuggestions([])

    if (normalized.length === 0) {
      setHandleError(null)
      return
    }
    if (normalized.length < minLength) {
      setHandleError(`Handle must be at least ${minLength} characters.`)
      return
    }
    if (!/^[a-z0-9_-]+$/.test(normalized)) {
      setHandleError('Only lowercase letters, numbers, hyphens, and underscores allowed.')
      return
    }
    setHandleError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsCheckingHandle(true)
      try {
        const governance = await lenserService.checkHandle(normalized)
        if (governance.verdict === 'deny') {
          const reason = governance.class_hit
            ? `This handle is reserved (${governance.class_hit}). Please choose a different one.`
            : 'This handle is reserved or protected. Please choose a different one.'
          setHandleError(reason)
          setSuggestions([])
          setIsHandleUnique(false)
          return
        }

        const existing = await lenserService.getLenserByHandle(normalized)
        if (existing) {
          setHandleError('Handle is already taken.')
          setSuggestions([
            `${normalized}123`,
            `${normalized}_bot`,
            `ai_${normalized}`,
            `${normalized}.ai`,
            `my_${normalized}`,
          ])
          setIsHandleUnique(false)
        } else {
          setIsHandleUnique(true)
          setSuggestions([])
        }
      } catch {
        // Ignore check errors — user can still try to submit
      } finally {
        setIsCheckingHandle(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [normalized, minLength])

  return {
    handle,
    setHandle,
    normalizedHandle: normalized,
    isCheckingHandle,
    isHandleUnique,
    handleError,
    suggestions,
  }
}
