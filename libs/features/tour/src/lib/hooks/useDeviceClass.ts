import { breakpoints } from '@lenserfight/ui/tokens'
import { useEffect, useState } from 'react'

import type { TourDeviceClass } from '../types'

const md = parseInt(breakpoints.md, 10)
const lg = parseInt(breakpoints.lg, 10)

function classify(width: number): TourDeviceClass {
  if (width < md) return 'mobile'
  if (width < lg) return 'tablet'
  return 'desktop'
}

/**
 * matchMedia-based device classification: mobile < md, tablet md..lg-1, desktop >= lg.
 * SSR/first-render safe — defaults to 'desktop' when no window is available.
 */
export function useDeviceClass(): TourDeviceClass {
  const [device, setDevice] = useState<TourDeviceClass>(() =>
    typeof window === 'undefined' ? 'desktop' : classify(window.innerWidth),
  )

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mqMd = window.matchMedia(`(min-width: ${breakpoints.md})`)
    const mqLg = window.matchMedia(`(min-width: ${breakpoints.lg})`)
    const update = () => setDevice(classify(window.innerWidth))
    update()
    mqMd.addEventListener('change', update)
    mqLg.addEventListener('change', update)
    return () => {
      mqMd.removeEventListener('change', update)
      mqLg.removeEventListener('change', update)
    }
  }, [])

  return device
}
