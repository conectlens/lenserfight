import { MessageSquarePlus, Sparkles } from 'lucide-react'
import React from 'react'

import { Button } from '@lenserfight/ui/components'

export interface TagCreateActionsProps {
  onCreateThread: () => void
  onCreateLens: () => void
  /**
   * `header` sits beside the ray title and stays compact; `empty` is the
   * call to action inside an empty grid, where the buttons carry the page.
   */
  placement?: 'header' | 'empty'
  disabled?: boolean
}

/**
 * The "add something to this ray" affordance. Rendered beside the ray title
 * when the grid has content, and inside the empty state when it does not —
 * one component so the two placements cannot drift apart.
 *
 * A Workflow action is expected here later; the layout already tolerates a
 * third button.
 */
export const TagCreateActions: React.FC<TagCreateActionsProps> = ({
  onCreateThread,
  onCreateLens,
  placement = 'header',
  disabled,
}) => {
  const size = placement === 'empty' ? 'md' : 'sm'

  return (
    <div
      className={
        placement === 'empty'
          ? 'flex flex-col sm:flex-row items-center justify-center gap-3'
          : 'flex flex-wrap items-center gap-2'
      }
    >
      <Button
        type="button"
        variant="primary"
        size={size}
        onClick={onCreateThread}
        disabled={disabled}
      >
        <MessageSquarePlus size={16} />
        Create Thread
      </Button>
      <Button
        type="button"
        variant="secondary"
        size={size}
        onClick={onCreateLens}
        disabled={disabled}
      >
        <Sparkles size={16} />
        Create Lens
      </Button>
    </div>
  )
}
