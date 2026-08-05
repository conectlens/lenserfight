import { useOptionalAuth } from '@lenserfight/features/auth'
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'

import { TOURS } from './definitions'
import { useDeviceClass } from './hooks/useDeviceClass'
import {
  fetchRemoteSeenTourIds,
  markTourSeenRemote,
  readSeenTourIds,
  writeSeenTourIds,
} from './persistence'
import { getTourSteps, resolveTourForPath } from './registry'
import { TourOverlay } from './TourOverlay'

import type { TourDefinition, TourStep } from './types'

export interface ActiveTour {
  definition: TourDefinition
  steps: TourStep[]
  stepIndex: number
}

export interface TourController {
  activeTour: ActiveTour | null
  /** Starts a tour by id. No-op if the id is unknown or its steps resolve empty. Ignores seen state. */
  start(tourId: string): void
  next(): void
  back(): void
  /** Skips the tour and marks it seen. */
  skip(): void
  /** Completes the tour and marks it seen. */
  done(): void
  isSeen(tourId: string): boolean
  tourForCurrentPath: TourDefinition | undefined
}

const AUTO_RUN_DELAY_MS = 900

const TourContext = createContext<TourController | null>(null)

/**
 * Drops state-aware steps whose target is absent from the document right now.
 */
function filterRunnableSteps(steps: TourStep[]): TourStep[] {
  if (typeof document === 'undefined') return steps
  return steps.filter((step) => {
    if (!step.skipIfTargetMissing || !step.target) return true
    try {
      return !!document.querySelector(step.target)
    } catch {
      return false
    }
  })
}

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation()
  const device = useDeviceClass()
  const auth = useOptionalAuth()
  const isAuthenticated = !!auth?.isAuthenticated

  const [seen, setSeen] = useState<ReadonlySet<string>>(() => new Set(readSeenTourIds()))
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null)

  const tourForCurrentPath = useMemo(() => resolveTourForPath(pathname), [pathname])

  // Merge server-side seen ids once per authenticated session
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false
    fetchRemoteSeenTourIds().then((ids) => {
      if (cancelled || ids.length === 0) return
      setSeen((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.add(id)
        writeSeenTourIds([...next])
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [isAuthenticated])

  const markSeen = useCallback(
    (tourId: string) => {
      setSeen((prev) => {
        if (prev.has(tourId)) return prev
        const next = new Set(prev)
        next.add(tourId)
        writeSeenTourIds([...next])
        return next
      })
      if (isAuthenticated) markTourSeenRemote(tourId)
    },
    [isAuthenticated],
  )

  const start = useCallback(
    (tourId: string) => {
      const definition = TOURS.find((def) => def.id === tourId)
      if (!definition) return
      const steps = filterRunnableSteps(getTourSteps(definition, device))
      if (steps.length === 0) return
      setActiveTour({ definition, steps, stepIndex: 0 })
    },
    [device],
  )

  // Auto-run: give the page a moment to render, then start an unseen tour
  useEffect(() => {
    if (activeTour) return
    const def = resolveTourForPath(pathname)
    if (!def || seen.has(def.id)) return
    const steps = filterRunnableSteps(getTourSteps(def, device))
    if (steps.length === 0) return
    const timer = setTimeout(() => {
      setActiveTour({ definition: def, steps, stepIndex: 0 })
    }, AUTO_RUN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [pathname, device, seen, activeTour])

  const done = useCallback(() => {
    setActiveTour((current) => {
      if (current) markSeen(current.definition.id)
      return null
    })
  }, [markSeen])

  const skip = useCallback(() => {
    setActiveTour((current) => {
      if (current) markSeen(current.definition.id)
      return null
    })
  }, [markSeen])

  const next = useCallback(() => {
    setActiveTour((current) => {
      if (!current) return current
      if (current.stepIndex >= current.steps.length - 1) {
        markSeen(current.definition.id)
        return null
      }
      return { ...current, stepIndex: current.stepIndex + 1 }
    })
  }, [markSeen])

  const back = useCallback(() => {
    setActiveTour((current) =>
      current ? { ...current, stepIndex: Math.max(0, current.stepIndex - 1) } : current,
    )
  }, [])

  const isSeen = useCallback((tourId: string) => seen.has(tourId), [seen])

  const controller = useMemo<TourController>(
    () => ({
      activeTour,
      start,
      next,
      back,
      skip,
      done,
      isSeen,
      tourForCurrentPath,
    }),
    [activeTour, start, next, back, skip, done, isSeen, tourForCurrentPath],
  )

  return (
    <TourContext.Provider value={controller}>
      {children}
      {activeTour && <TourOverlay />}
    </TourContext.Provider>
  )
}

export function useTour(): TourController {
  const context = useContext(TourContext)
  if (!context) throw new Error('useTour must be used within TourProvider')
  return context
}
