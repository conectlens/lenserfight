import React, { useEffect, useState } from 'react'

/**
 * Plays two pre-rendered product tours back to back — the main platform tour,
 * then the AI agent creation + Control Room tour — swapping automatically
 * when each one finishes, then looping. Frame counts come from
 * hero-tour-meta.json (written by scripts/generate-hero-preview.mjs) so the
 * swap timing stays correct after the assets are regenerated; if that fetch
 * fails, sane defaults keep playback working without exact frame counts.
 */

interface TourMeta {
  delayMs: number
  main: { frames: number }
  agent: { frames: number } | null
}

interface DemoTour {
  key: string
  light: string
  dark: string
  frames: number
}

const DEFAULT_META: TourMeta = {
  delayMs: 1600,
  main: { frames: 12 },
  agent: { frames: 9 },
}

interface HeroDemoPlayerProps {
  alt: string
  width: number
  height: number
}

export const HeroDemoPlayer: React.FC<HeroDemoPlayerProps> = ({ alt, width, height }) => {
  const [meta, setMeta] = useState<TourMeta>(DEFAULT_META)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetch('/screenshots/hero-tour-meta.json')
      .then((res) => (res.ok ? (res.json() as Promise<TourMeta>) : null))
      .then((data) => {
        if (data && !cancelled) setMeta(data)
      })
      .catch(() => {
        // keep DEFAULT_META — the images still play, just with approximate timing
      })
    return () => {
      cancelled = true
    }
  }, [])

  const demos: DemoTour[] = [
    {
      key: 'main',
      light: '/screenshots/hero-tour-light.webp',
      dark: '/screenshots/hero-tour-dark.webp',
      frames: meta.main.frames,
    },
    ...(meta.agent
      ? [
          {
            key: 'agent',
            light: '/screenshots/hero-agent-tour-light.webp',
            dark: '/screenshots/hero-agent-tour-dark.webp',
            frames: meta.agent.frames,
          },
        ]
      : []),
  ]

  const active = demos[activeIndex % demos.length]

  useEffect(() => {
    if (demos.length < 2) return
    const duration = active.frames * meta.delayMs + 400
    const timer = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % demos.length)
    }, duration)
    return () => clearTimeout(timer)
  }, [active, meta.delayMs, demos.length])

  // Warm the browser cache for the next tour while the current one plays, so
  // the swap doesn't show a blank frame while its WebP loads.
  useEffect(() => {
    if (demos.length < 2) return
    const next = demos[(activeIndex + 1) % demos.length]
    const preloadLight = new window.Image()
    preloadLight.src = next.light
    const preloadDark = new window.Image()
    preloadDark.src = next.dark
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `demos` is a fresh array every render; only activeIndex should retrigger this
  }, [activeIndex])

  return (
    <React.Fragment key={active.key}>
      <img
        src={active.light}
        alt={alt}
        className="w-full dark:hidden"
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
      />
      <img
        src={active.dark}
        alt={alt}
        className="hidden w-full dark:block"
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
      />
    </React.Fragment>
  )
}
