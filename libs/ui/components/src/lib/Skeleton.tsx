import React from 'react'

export type SkeletonVariant = 'pulse' | 'shimmer'

export interface SkeletonProps {
  variant?: SkeletonVariant
  shape?: 'line' | 'circle' | 'rect'
  width?: string
  height?: string
  className?: string
}

export interface SkeletonCardProps {
  variant?: SkeletonVariant
  lines?: number
  showAvatar?: boolean
  className?: string
}

const variantClass: Record<SkeletonVariant, string> = {
  pulse: 'animate-pulse',
  shimmer: 'skeleton-shimmer',
}

const shapeClass: Record<NonNullable<SkeletonProps['shape']>, string> = {
  line: 'rounded h-4 w-full',
  circle: 'rounded-full',
  rect: 'rounded-lg',
}

function SkeletonBase({
  variant = 'pulse',
  shape = 'rect',
  width,
  height,
  className = '',
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block bg-greyscale-200 dark:bg-greyscale-700 ${variantClass[variant]} ${shapeClass[shape]} ${className}`}
      style={{ width, height }}
    />
  )
}

function SkeletonCard({
  variant = 'pulse',
  lines = 3,
  showAvatar = true,
  className = '',
}: SkeletonCardProps) {
  return (
    <div
      aria-busy="true"
      aria-label="Loading"
      className={`flex gap-3 ${className}`}
    >
      {showAvatar && (
        <SkeletonBase
          variant={variant}
          shape="circle"
          width="40px"
          height="40px"
          className="shrink-0"
        />
      )}
      <div className="flex-1 space-y-2.5">
        <SkeletonBase variant={variant} shape="line" width="60%" />
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            variant={variant}
            shape="line"
            width={i === lines - 1 ? '75%' : '100%'}
          />
        ))}
      </div>
    </div>
  )
}

export const Skeleton = Object.assign(SkeletonBase, { Card: SkeletonCard })
export { SkeletonCard }
