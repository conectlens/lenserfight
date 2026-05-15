import React from 'react'

export interface FlagIconProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "TR", "GB", "JP". Case-insensitive. */
  countryCode: string
  /** Optional pixel size (forwarded as font-size so the emoji glyph scales). */
  size?: number
  className?: string
  title?: string
}

function countryCodeToFlagEmoji(code: string): string {
  const upper = code.trim().toUpperCase()
  if (upper.length !== 2) return ''
  const A = 0x41
  const REGIONAL_A = 0x1f1e6
  const first = upper.charCodeAt(0)
  const second = upper.charCodeAt(1)
  if (first < A || first > A + 25 || second < A || second > A + 25) return ''
  return (
    String.fromCodePoint(REGIONAL_A + (first - A)) +
    String.fromCodePoint(REGIONAL_A + (second - A))
  )
}

/**
 * Renders an ISO country flag as a Unicode regional-indicator emoji.
 *
 * Designed to satisfy `SelectField`'s `Option.icon: React.ElementType` so it
 * drops into the shared select with no special-case logic. Emoji rendering is
 * native on macOS / iOS / Android / modern Linux. On Windows, the OS lacks a
 * color flag font; the glyph degrades to the two regional-indicator letters
 * (e.g. "🇹🇷" → "TR"), which still communicates the locale.
 */
export const FlagIcon: React.FC<FlagIconProps> = ({
  countryCode,
  size = 16,
  className = '',
  title,
}) => {
  const glyph = countryCodeToFlagEmoji(countryCode)
  return (
    <span
      role="img"
      aria-label={title ?? countryCode}
      title={title}
      className={`inline-flex items-center justify-center leading-none select-none ${className}`}
      style={{ fontSize: size, lineHeight: 1, width: size, height: size }}
    >
      {glyph || countryCode.toUpperCase()}
    </span>
  )
}

/**
 * Factory: returns a component bound to a specific country code, suitable for
 * `Option.icon` in `SelectField` (which expects a `React.ElementType`).
 */
export function makeFlagIcon(countryCode: string): React.FC<{ size?: number; className?: string }> {
  const Bound: React.FC<{ size?: number; className?: string }> = (props) => (
    <FlagIcon countryCode={countryCode} {...props} />
  )
  Bound.displayName = `FlagIcon(${countryCode})`
  return Bound
}
