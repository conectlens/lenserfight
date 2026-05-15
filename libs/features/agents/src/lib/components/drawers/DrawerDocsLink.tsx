import { HelpButton, Tooltip } from '@lenserfight/ui/components'
import React from 'react'

interface DrawerDocsLinkProps {
  /** Locale-agnostic docs path, e.g. '/how-to/agents/workspace-guide#schedule-drawer' */
  path: string
  /** Long-form hover explanation describing every field/behavior of the drawer. */
  tip: React.ReactNode
  /** Optional pill label. Defaults to "Docs". */
  label?: string
  className?: string
}

/**
 * Header strip rendered at the top of agent workspace drawers. The Tooltip
 * surfaces a quick contextual explanation on hover; the HelpButton deep-links
 * to the full documentation page. Encapsulates the duplicated markup so every
 * drawer can adopt it with a single line. (GRASP: Information Expert)
 */
export const DrawerDocsLink: React.FC<DrawerDocsLinkProps> = ({
  path,
  tip,
  label = 'Docs',
  className = '',
}) => (
  <div className={`mb-4 flex justify-end ${className}`}>
    <Tooltip
      content={tip}
      position="bottom"
      contentClassName="max-w-xs whitespace-normal text-left leading-5"
    >
      <HelpButton path={path} label={label} />
    </Tooltip>
  </div>
)
