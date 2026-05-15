import React, { useMemo } from 'react'

interface XCarouselProps {
  children: React.ReactNode
  /** Duration of one full loop in seconds. Higher is slower. Default 30. */
  speed?: number
  /** Whether to pause the animation when the user hovers. Default true. */
  pauseOnHover?: boolean
  /** Optional tailwind gap class. Default 'gap-4' (1rem). */
  gapClass?: string
  /** The actual gap value in pixels to use for the loop calculation. Default 16 (for gap-4). */
  gapPx?: number
  /** Whether to show fade masks on the edges. Default false. */
  showFadeMasks?: boolean
  /** Optional color for fade masks. Defaults to surface-base or provided value. */
  fadeColorClass?: string
  className?: string
}

/**
 * XCarousel is a performant, GPU-accelerated infinite horizontal scroller.
 * It uses CSS animations and hardware acceleration (translate3d) to ensure
 * smooth motion even with many complex elements.
 */
export const XCarousel: React.FC<XCarouselProps> = ({
  children,
  speed = 30,
  pauseOnHover = true,
  gapClass = 'gap-4',
  gapPx = 16,
  showFadeMasks = false,
  fadeColorClass = 'from-surface-base',
  className = '',
}) => {
  // Unique ID for the animation keyframes to avoid collisions if multiple carousels are present
  const id = useMemo(() => `x-carousel-${Math.random().toString(36).substring(2, 9)}`, [])

  return (
    <div className={`overflow-hidden w-full group relative ${className}`} role="group">
      <style>{`
        @keyframes ${id}-scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(calc(-50% - ${gapPx / 2}px), 0, 0); }
        }
        .${id}-animate {
          animation: ${id}-scroll ${speed}s linear infinite;
          will-change: transform;
        }
        ${pauseOnHover ? `.${id}-animate-container:hover .${id}-animate { animation-play-state: paused; }` : ''}
      `}</style>

      {showFadeMasks && (
        <>
          <div className={`absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r ${fadeColorClass} z-10 pointer-events-none`} />
          <div className={`absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l ${fadeColorClass} z-10 pointer-events-none`} />
        </>
      )}

      <div className={`${id}-animate-container w-full`}>
        <div className={`flex ${gapClass} ${id}-animate w-max`}>
          {children}
          {children}
        </div>
      </div>
    </div>
  )
}
