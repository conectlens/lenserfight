import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * URL-driven drawer state manager.
 *
 * Encodes drawer name as a search param:
 *   ?drawer=executions
 *
 * Browser back/forward correctly opens and closes drawers because
 * visibility is derived entirely from the URL.
 */
export const useDrawerRouter = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const drawer = searchParams.get('drawer')

  const open = useCallback(
    (name: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.set('drawer', name)
          return next
        },
        { replace: false },
      )
    },
    [setSearchParams],
  )

  const close = useCallback(() => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('drawer')
        return next
      },
      { replace: true },
    )
  }, [setSearchParams])

  const isOpen = useCallback((name: string) => drawer === name, [drawer])

  return { drawer, isOpen, open, close }
}
