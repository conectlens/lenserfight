import { act, render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TourProvider, useTour } from './TourContext'

import type { TourController } from './TourContext'
import type { TourDefinition } from './types'

const { mockGetPreferences, mockMarkTourSeen, mockAuthRef, mockPathnameRef, tourX, tourFiltered } =
  vi.hoisted(() => {
    const tourX: TourDefinition = {
      id: 't.x',
      routePatterns: ['/x'],
      steps: {
        desktop: [
          { titleKey: 'x.s1.title', bodyKey: 'x.s1.body' },
          { titleKey: 'x.s2.title', bodyKey: 'x.s2.body' },
        ],
      },
    }

    const tourFiltered: TourDefinition = {
      id: 't.filtered',
      routePatterns: ['/y'],
      steps: {
        desktop: [
          { titleKey: 'y.s1.title', bodyKey: 'y.s1.body' },
          {
            titleKey: 'y.s2.title',
            bodyKey: 'y.s2.body',
            target: '[data-tour="missing-anchor"]',
            skipIfTargetMissing: true,
          },
        ],
      },
    }

    return {
      mockGetPreferences: vi.fn(),
      mockMarkTourSeen: vi.fn(),
      mockAuthRef: { current: null as { isAuthenticated: boolean } | null },
      mockPathnameRef: { current: '/x' },
      tourX,
      tourFiltered,
    }
  })

vi.mock('./definitions', () => ({
  TOURS: [tourX, tourFiltered],
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useLocation: () => ({ pathname: mockPathnameRef.current }),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('@lenserfight/data/repositories', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@lenserfight/data/repositories')>()),
  preferencesService: {
    getPreferences: mockGetPreferences,
    markTourSeen: mockMarkTourSeen,
  },
}))

vi.mock('@lenserfight/features/auth', () => ({
  useOptionalAuth: () => mockAuthRef.current,
}))

let controller: TourController | null = null

const Capture: React.FC = () => {
  controller = useTour()
  return null
}

function renderProvider() {
  return render(
    <TourProvider>
      <Capture />
    </TourProvider>,
  )
}

describe('TourProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    controller = null
    mockAuthRef.current = null
    mockPathnameRef.current = '/x'
    mockGetPreferences.mockResolvedValue(null)
    mockMarkTourSeen.mockResolvedValue(undefined)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  })

  it('auto-runs an unseen tour for the current path after the delay', () => {
    vi.useFakeTimers()
    try {
      renderProvider()
      expect(controller?.activeTour).toBeNull()

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(controller?.activeTour?.definition.id).toBe('t.x')
      expect(controller?.activeTour?.stepIndex).toBe(0)
      expect(screen.getByText('x.s1.title')).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('never auto-runs a seen tour', () => {
    vi.useFakeTimers()
    try {
      localStorage.setItem('lf_tours_seen', JSON.stringify(['t.x']))
      renderProvider()

      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(controller?.activeTour).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('manual start ignores seen state and next/back navigate steps', () => {
    localStorage.setItem('lf_tours_seen', JSON.stringify(['t.x']))
    renderProvider()

    act(() => controller?.start('t.x'))
    expect(controller?.activeTour?.stepIndex).toBe(0)

    act(() => controller?.next())
    expect(controller?.activeTour?.stepIndex).toBe(1)

    act(() => controller?.back())
    expect(controller?.activeTour?.stepIndex).toBe(0)

    act(() => controller?.back())
    expect(controller?.activeTour?.stepIndex).toBe(0)
  })

  it('start is a no-op for unknown tour ids', () => {
    renderProvider()

    act(() => controller?.start('t.unknown'))

    expect(controller?.activeTour).toBeNull()
  })

  it('next past the last step finishes the tour and marks it seen', () => {
    renderProvider()

    act(() => controller?.start('t.x'))
    act(() => controller?.next())
    act(() => controller?.next())

    expect(controller?.activeTour).toBeNull()
    expect(controller?.isSeen('t.x')).toBe(true)
    expect(JSON.parse(localStorage.getItem('lf_tours_seen') ?? '[]')).toContain('t.x')
  })

  it('skip marks seen locally and remotely when authenticated', () => {
    mockAuthRef.current = { isAuthenticated: true }
    renderProvider()

    act(() => controller?.start('t.x'))
    act(() => controller?.skip())

    expect(controller?.activeTour).toBeNull()
    expect(controller?.isSeen('t.x')).toBe(true)
    expect(mockMarkTourSeen).toHaveBeenCalledWith('t.x')
  })

  it('skip does not call the server when unauthenticated', () => {
    renderProvider()

    act(() => controller?.start('t.x'))
    act(() => controller?.skip())

    expect(controller?.isSeen('t.x')).toBe(true)
    expect(mockMarkTourSeen).not.toHaveBeenCalled()
  })

  it('filters out skipIfTargetMissing steps whose target is absent', () => {
    renderProvider()

    act(() => controller?.start('t.filtered'))

    expect(controller?.activeTour?.steps).toHaveLength(1)
    expect(controller?.activeTour?.steps[0].titleKey).toBe('y.s1.title')
  })

  it('merges server-side seen ids when authenticated', async () => {
    mockAuthRef.current = { isAuthenticated: true }
    mockGetPreferences.mockResolvedValue({ tours_seen: { 't.x': '2026-01-01T00:00:00Z' } })
    renderProvider()

    await act(async () => {})

    expect(controller?.isSeen('t.x')).toBe(true)
    expect(JSON.parse(localStorage.getItem('lf_tours_seen') ?? '[]')).toContain('t.x')
  })
})
