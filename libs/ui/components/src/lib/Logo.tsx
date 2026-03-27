import React from 'react'

interface LogoProps {
  /** Width/height of the logo mark in pixels. Defaults to 28. */
  size?: number
  /** Show the wordmark next to the logo mark. Defaults to true. */
  showWordmark?: boolean
  /** Show the Beta badge next to the logo. Defaults to false. */
  showBeta?: boolean
  className?: string
}

/**
 * Brand logo mark — shows the original icon in light mode and the white
 * variant in dark mode via Tailwind's dark-mode classes.
 */
export const Logo: React.FC<LogoProps> = ({
  size = 28,
  showWordmark = true,
  showBeta = false,
  className = '',
}) => {
  return (
    <span className={`inline-flex items-center gap-2 relative ${className}`}>
      {/* Light theme icon */}
      <img
        src="/favicons/original/ms-icon-150x150.png"
        alt="LenserFight"
        width={size}
        height={size}
        className="block dark:hidden object-contain flex-shrink-0"
        draggable={false}
      />
      {/* Dark theme icon (white variant) */}
      <img
        src="/favicons/white/ms-icon-150x150.png"
        alt="LenserFight"
        width={size}
        height={size}
        className="hidden dark:block object-contain flex-shrink-0"
        draggable={false}
      />

      {showWordmark && (
        <span
          className="font-black tracking-tight text-gray-900 dark:text-white leading-none pr-3"
          style={{ fontSize: size * 0.64 }}
        >
          LenserFight
        </span>
      )}

      {showBeta && (
        <span className="absolute -bottom-2.5 right-0 bg-primary text-gray-900 text-[9px] font-bold px-1.5 py-0.5 rounded border border-yellow-300 shadow-sm leading-none tracking-wide z-10">
          BETA
        </span>
      )}
    </span>
  )
}
