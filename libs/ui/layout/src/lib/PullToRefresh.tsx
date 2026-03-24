/**
 * PullToRefresh.tsx — web stub (mobile-only component).
 *
 * Pull-to-refresh is not applicable on web. This stub renders a plain div.
 */
import React from 'react'

export interface PullToRefreshProps {
  onRefresh:    () => Promise<void> | void
  children:     React.ReactNode
  style?:       React.CSSProperties
  contentStyle?: React.CSSProperties
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children, style }) => (
  <div style={{ flex: 1, overflow: 'auto', ...style }}>{children}</div>
)

PullToRefresh.displayName = 'PullToRefresh'
