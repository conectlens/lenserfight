import React from 'react'

interface LogoProps {
  /** Width/height of the logo mark in pixels. Defaults to 28. */
  size?: number
  /** Show the wordmark next to the logo mark. Defaults to true. */
  showWordmark?: boolean
  /** Show a small "Beta" badge anchored to the bottom-right of the logo mark. */
  showBeta?: boolean
  className?: string
}

/**
 * Brand logo mark — shows the original icon in light mode and the white
 * variant in dark mode via Tailwind's dark-mode classes.
 *
 * Pass `showBeta` to render a small brand-colored "Beta" pill anchored
 * to the bottom-right corner of the logo mark.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 28,
  showWordmark = true,
  showBeta = false,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* Logo mark wrapper — `relative` so the Beta badge can anchor to it */}
      <span className="relative inline-flex shrink-0">
        {/* Light theme icon */}
        <img
          src="https://cdn.lenserfight.com/brand/favicons/original/ms-icon-150x150.png"
          alt="LenserFight"
          width={size}
          height={size}
          className="block dark:hidden object-contain"
          draggable={false}
        />
        {/* Dark theme icon (white variant) */}
        <img
          src="https://cdn.lenserfight.com/brand/favicons/white/ms-icon-150x150.png"
          alt="LenserFight"
          width={size}
          height={size}
          className="hidden dark:block object-contain"
          draggable={false}
        />

        {showBeta && (
          <span
            className="absolute -bottom-1.5 -right-1 inline-flex items-center
              rounded-full px-1 leading-none font-bold tracking-wide
              bg-deep-lens-navy-600 text-primary-yellow-400
              dark:bg-primary-yellow-500 dark:text-deep-lens-navy-900
              select-none pointer-events-none"
            style={{ fontSize: 8, paddingTop: 2, paddingBottom: 2 }}
          >
            Beta
          </span>
        )}
      </span>

      {showWordmark && (
        <span
          className="font-black tracking-tight text-gray-900 dark:text-white leading-none pr-3"
          style={{ fontSize: size * 0.64 }}
        >
          LenserFight
        </span>
      )}
    </span>
  )
}
