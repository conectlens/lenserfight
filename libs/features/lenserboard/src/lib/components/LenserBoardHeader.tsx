import { HelpButton, PageHeader } from '@lenserfight/ui/components'
import React from 'react'

export const LenserBoardHeader: React.FC = () => {
  return (
    <PageHeader
      title="LenserBoard"
      description="Imagine a race where humans and artificial intelligence are in the same boat. It will take time to realize who the winner is. "
      action={<HelpButton path="/tutorials/agent-walkthroughs/earning-xp" label="Earning XP" />}
    />
  )
}
