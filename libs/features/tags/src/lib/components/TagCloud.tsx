import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { TagUsage } from '@lenserfight/types'

interface TagCloudProps {
  tags: TagUsage[]
}

export const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
  const navigate = useNavigate()

  const cloudTags = useMemo(() => {
    // Shuffle tags to avoid linear size sorting (big to small)
    const shuffled = [...tags].sort(() => Math.random() - 0.5)

    return shuffled.map((tag) => {
      const weight = tag.weight || 1

      // Randomized Visual Properties
      const rotation = Math.floor(Math.random() * 30) - 15 // -15deg to +15deg
      const translateY = Math.floor(Math.random() * 20) - 10 // -10px to +10px
      const margin = Math.random() * 1.5 + 0.5 // 0.5rem to 2rem spacing

      // Animation parameters for micro-drift
      const duration = 10 + Math.random() * 10 // 10s - 20s
      const delay = -1 * Math.random() * 20 // random start offset to desync (-20s to 0s)
      const x = (Math.random() - 0.5) * 6 // -3px to 3px
      const y = (Math.random() - 0.5) * 6 // -3px to 3px

      return {
        ...tag,
        visuals: {
          rotation,
          translateY,
          margin,
          weight,
          drift: { duration, delay, x, y },
        },
      }
    })
  }, [tags])

  const getTagStyles = (weight: number) => {
    // Dynamic Typography & Color Scaling based on Engagement Weight (1-10)
    if (weight >= 9) {
      return {
        className:
          'text-5xl md:text-7xl font-black text-gray-900 dark:text-white z-30 opacity-100 hover:text-primary-600 dark:hover:text-primary-400',
        scale: 1.1,
      }
    }
    if (weight >= 7) {
      return {
        className:
          'text-4xl md:text-6xl font-extrabold text-gray-800 dark:text-gray-200 z-20 opacity-95 hover:text-primary-600 dark:hover:text-primary-400',
        scale: 1.05,
      }
    }
    if (weight >= 5) {
      return {
        className:
          'text-3xl md:text-5xl font-bold text-gray-600 dark:text-gray-400 z-10 opacity-80 hover:text-gray-900 dark:hover:text-white',
        scale: 1,
      }
    }
    if (weight >= 3) {
      return {
        className:
          'text-xl md:text-3xl font-semibold text-gray-400 dark:text-gray-500 z-0 opacity-60 hover:text-gray-700 dark:hover:text-gray-300',
        scale: 0.95,
      }
    }
    return {
      className:
        'text-lg md:text-xl font-medium text-gray-300 dark:text-gray-600 z-0 opacity-40 hover:text-gray-500 dark:hover:text-gray-400 blur-[0.5px] hover:blur-0',
      scale: 0.9,
    }
  }

  return (
    <>
      <style>{`
        @keyframes micro-drift {
          0%, 100% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(var(--drift-x), var(--drift-y), 0); }
        }
      `}</style>
      <div className="flex flex-wrap justify-center items-center content-center w-full min-h-[50vh] py-12 px-4 md:px-16 overflow-visible perspective-1000 gap-4">
        {cloudTags.map((tag) => {
          const styles = getTagStyles(tag.visuals.weight)

          return (
            <button
              key={tag.id}
              onClick={() => navigate(`/len/${tag.slug}`)}
              className={`
                relative cursor-pointer transition-all duration-500 ease-out 
                hover:scale-110 hover:rotate-0 hover:z-50 hover:opacity-100
                focus:outline-none focus:scale-110 focus:text-primary-700
                select-none leading-none tracking-tight
                ${styles.className}
              `}
              style={{
                transform: `rotate(${tag.visuals.rotation}deg) translateY(${tag.visuals.translateY}px)`,
                margin: `0 ${tag.visuals.margin}rem`,
              }}
              title={`${tag.name}: ${tag.count} uses`}
            >
              <span
                style={
                  {
                    display: 'inline-block',
                    animation: `micro-drift ${tag.visuals.drift.duration}s ease-in-out ${tag.visuals.drift.delay}s infinite`,
                    '--drift-x': `${tag.visuals.drift.x}px`,
                    '--drift-y': `${tag.visuals.drift.y}px`,
                    willChange: 'transform',
                  } as React.CSSProperties
                }
              >
                {tag.name}
              </span>
            </button>
          )
        })}
      </div>
    </>
  )
}
