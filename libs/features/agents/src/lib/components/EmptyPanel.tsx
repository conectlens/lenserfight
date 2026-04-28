import React from 'react'

interface EmptyPanelProps {
  icon: React.ReactNode
  title: string
  description: string
  children?: React.ReactNode
}

/**
 * Dashed-border empty panel used across agent control surfaces. Originally
 * defined inline in `AgentControlRoomPage`; extracted in F1 so every page
 * mode (human-owner, agent-public, etc.) can render a consistent empty state.
 */
export const EmptyPanel: React.FC<EmptyPanelProps> = ({
  icon,
  title,
  description,
  children,
}) => (
  <div className="rounded-[28px] border border-dashed border-gray-300 bg-white/80 p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
      {icon}
    </div>
    <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
      {title}
    </h3>
    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
      {description}
    </p>
    {children}
  </div>
)
