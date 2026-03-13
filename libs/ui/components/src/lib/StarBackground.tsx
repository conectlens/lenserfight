import { type ISourceOptions, MoveDirection, OutMode } from '@tsparticles/engine'
import Particles, { initParticlesEngine } from '@tsparticles/react'
import { loadSlim } from '@tsparticles/slim'
import React, { useEffect, useState, useMemo } from 'react'

const StarBackground: React.FC = () => {
  const [init, setInit] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine)
    })
      .then(() => {
        setInit(true)
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'))
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => observer.disconnect()
  }, [])

  const options: ISourceOptions = useMemo(
    () => ({
      background: {
        color: {
          value: 'transparent',
        },
      },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: { enable: false },
          onHover: { enable: false },
          resize: { enable: true },
        },
      },
      particles: {
        color: { value: '#ffffff' },
        links: { enable: false },
        move: {
          direction: MoveDirection.none,
          enable: true,
          outModes: {
            default: OutMode.out,
          },
          random: true,
          speed: 0.2,
          straight: false,
        },
        number: {
          density: {
            enable: true,
            // Standard v3 config usually infers area, but we keep it simple to avoid type conflicts in strict mode
            width: 800,
            height: 800,
          } as any,
          value: 30,
        },
        opacity: {
          value: { min: 0.05, max: 0.12 },
          animation: {
            enable: true,
            speed: 0.5,
            sync: false,
          },
        },
        shape: { type: 'circle' },
        size: {
          value: { min: 1, max: 2 },
        },
      },
      detectRetina: true,
      fullScreen: { enable: false, zIndex: 0 },
    }),
    []
  )

  if (!init || !isDark || isMobile) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <Particles id="tsparticles" options={options} className="w-full h-full" />
    </div>
  )
}

export default StarBackground
