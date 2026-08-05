import { Button } from '@lenserfight/ui/components'
import { Backdrop, Portal } from '@lenserfight/ui/overlays'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useDeviceClass } from './hooks/useDeviceClass'
import { useReducedMotion } from './hooks/useReducedMotion'
import { useTour } from './TourContext'

import type { TourStep } from './types'

const BUBBLE_WIDTH = 320
const BUBBLE_EST_HEIGHT = 200
const RING_PADDING = 8
const BUBBLE_GAP = 12
const VIEWPORT_MARGIN = 16

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max))

/**
 * Positions the step bubble next to the target rect, flipping to the opposite
 * side when it would overflow the viewport and clamping it on-screen.
 */
function computeBubblePosition(
  rect: DOMRect,
  placement: NonNullable<TourStep['placement']>,
): { top: number; left: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const anchor = {
    top: rect.top - RING_PADDING,
    bottom: rect.bottom + RING_PADDING,
    left: rect.left - RING_PADDING,
    right: rect.right + RING_PADDING,
  }

  let side = placement
  if (side === 'bottom' && anchor.bottom + BUBBLE_GAP + BUBBLE_EST_HEIGHT > vh) side = 'top'
  else if (side === 'top' && anchor.top - BUBBLE_GAP - BUBBLE_EST_HEIGHT < 0) side = 'bottom'
  else if (side === 'right' && anchor.right + BUBBLE_GAP + BUBBLE_WIDTH > vw) side = 'left'
  else if (side === 'left' && anchor.left - BUBBLE_GAP - BUBBLE_WIDTH < 0) side = 'right'

  let top: number
  let left: number
  switch (side) {
    case 'top':
      top = anchor.top - BUBBLE_GAP - BUBBLE_EST_HEIGHT
      left = anchor.left
      break
    case 'left':
      top = anchor.top
      left = anchor.left - BUBBLE_GAP - BUBBLE_WIDTH
      break
    case 'right':
      top = anchor.top
      left = anchor.right + BUBBLE_GAP
      break
    case 'bottom':
    default:
      top = anchor.bottom + BUBBLE_GAP
      left = anchor.left
      break
  }

  return {
    top: clamp(top, VIEWPORT_MARGIN, vh - BUBBLE_EST_HEIGHT - VIEWPORT_MARGIN),
    left: clamp(left, VIEWPORT_MARGIN, vw - BUBBLE_WIDTH - VIEWPORT_MARGIN),
  }
}

export const TourOverlay: React.FC = () => {
  const { activeTour, next, back, skip, done } = useTour()
  const device = useDeviceClass()
  const reducedMotion = useReducedMotion()
  const { t } = useTranslation()
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const isMobile = device === 'mobile'
  const step = activeTour?.steps[activeTour.stepIndex]

  // Recompute the spotlight rect whenever the step changes, and on resize/scroll
  useEffect(() => {
    if (!step?.target || isMobile) {
      setTargetRect(null)
      return
    }
    const update = () => {
      try {
        const el = document.querySelector(step.target as string)
        setTargetRect(el ? el.getBoundingClientRect() : null)
      } catch {
        setTargetRect(null)
      }
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { capture: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, { capture: true })
    }
  }, [step, isMobile])

  // Keyboard navigation (desktop/tablet only — mobile is touch-first)
  useEffect(() => {
    if (!activeTour || isMobile) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [activeTour, isMobile, skip, next, back])

  if (!activeTour || !step) return null

  const { steps, stepIndex } = activeTour
  const isLast = stepIndex >= steps.length - 1
  const placement = step.placement ?? 'bottom'
  const motionClasses = reducedMotion
    ? ''
    : 'transition-opacity duration-150 motion-reduce:transition-none'

  const stepContent = (
    <>
      <h3 className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">
        {t(step.titleKey)}
      </h3>
      <p className="mt-1 text-sm text-greyscale-600 dark:text-greyscale-300">
        {t(step.bodyKey)}
      </p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-greyscale-500 dark:text-greyscale-400">
          {t('tour.ui.stepOf', { current: stepIndex + 1, total: steps.length })}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={skip}>
            {t('tour.ui.skip')}
          </Button>
          {stepIndex > 0 && (
            <Button variant="secondary" size="sm" onClick={back}>
              {t('tour.ui.back')}
            </Button>
          )}
          {isLast ? (
            <Button variant="primary" size="sm" onClick={done}>
              {t('tour.ui.done')}
            </Button>
          ) : (
            <Button variant="primary" size="sm" onClick={next}>
              {t('tour.ui.next')}
            </Button>
          )}
        </div>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <Portal>
        <div className="fixed inset-0 z-[10000]">
          <Backdrop />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t(step.titleKey)}
            className={`absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-surface-border bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] ${motionClasses}`}
          >
            {stepContent}
          </div>
        </div>
      </Portal>
    )
  }

  const bubbleStyle: React.CSSProperties = targetRect
    ? computeBubblePosition(targetRect, placement)
    : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }

  return (
    <Portal>
      <div className="fixed inset-0 z-[10000]">
        {targetRect ? (
          <div
            data-testid="tour-spotlight"
            className="pointer-events-none absolute rounded-lg"
            style={{
              top: targetRect.top - RING_PADDING,
              left: targetRect.left - RING_PADDING,
              width: targetRect.width + RING_PADDING * 2,
              height: targetRect.height + RING_PADDING * 2,
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55)',
            }}
          />
        ) : (
          <Backdrop />
        )}
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(step.titleKey)}
          className={`absolute w-80 rounded-xl border border-surface-border bg-surface-raised p-4 shadow-lg ${motionClasses}`}
          style={bubbleStyle}
        >
          {stepContent}
        </div>
      </div>
    </Portal>
  )
}
