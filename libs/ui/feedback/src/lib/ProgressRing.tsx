/**
 * ProgressRing.tsx — circular progress indicator (web version).
 *
 * Uses SVG for the ring arc. The native version uses react-native-svg.
 */
import React from 'react'

export interface ProgressRingProps {
  /** 0–100 */
  value:      number
  size?:      number
  strokeWidth?: number
  showLabel?: boolean
  label?:     string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size        = 64,
  strokeWidth = 5,
  showLabel   = false,
  label,
}) => {
  const clamped        = Math.min(100, Math.max(0, value))
  const radius         = (size - strokeWidth) / 2
  const circumference  = 2 * Math.PI * radius
  const dashoffset     = circumference - (clamped / 100) * circumference

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="var(--cl-surface-border)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke="var(--cl-navy-500)" strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={dashoffset}
          fill="none"
        />
      </svg>
      {showLabel && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 600 }}>{label ?? `${clamped}%`}</span>
        </div>
      )}
    </div>
  )
}

ProgressRing.displayName = 'ProgressRing'
