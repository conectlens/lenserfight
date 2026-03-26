import { useSearchParams } from 'react-router-dom'

/**
 * URL-driven modal state manager.
 *
 * Encodes modal name and wizard step as search params:
 *   ?modal=create-battle&step=1
 *
 * Browser back/forward correctly opens and closes modals because
 * visibility is derived entirely from the URL.
 */
export const useModalRouter = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const modal = searchParams.get('modal')
  const step = parseInt(searchParams.get('step') ?? '0', 10)

  const open = (name: string, initialStep = 0) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('modal', name)
        next.set('step', String(initialStep))
        return next
      },
      { replace: false }
    )
  }

  const close = () => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('modal')
        next.delete('step')
        return next
      },
      { replace: false }
    )
  }

  const goToStep = (n: number) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.set('step', String(n))
        return next
      },
      { replace: false }
    )
  }

  const isOpen = (name: string) => modal === name

  return { modal, step, isOpen, open, close, goToStep }
}
