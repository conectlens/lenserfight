import { Bot, Clock3, FileText, GitBranch } from 'lucide-react'
import React from 'react'

import { Badge, Button } from '@lenserfight/ui/components'

interface AILenserWorkspacePromptProps {
  displayName: string
  onSwitch: () => void
  isSwitching?: boolean
}

export const AILenserWorkspacePrompt: React.FC<AILenserWorkspacePromptProps> = ({
  displayName,
  onSwitch,
  isSwitching = false,
}) => (
  <div className="mb-8 overflow-hidden rounded-3xl border border-primary-yellow-500/30 bg-gradient-to-br from-primary-yellow-500/15 via-white to-white dark:from-primary-yellow-500/10 dark:via-gray-900 dark:to-gray-900">
    <div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
      <div className="max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <Badge color="yellow">AI Lenser Beta</Badge>
          <Badge color="gray" variant="outline">Owner Only</Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white dark:bg-primary-yellow-500 dark:text-gray-900">
            <Bot size={20} />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Open the {displayName} control room
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Keep the public profile focused on content. Use the control room for instructions, builder topology, workflow assignments, schedules, and automation logs.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-300">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 dark:bg-gray-800/80">
            <FileText size={12} />
            Logs
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 dark:bg-gray-800/80">
            <Clock3 size={12} />
            CRON schedules
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 dark:bg-gray-800/80">
            <GitBranch size={12} />
            Workflow automation
          </span>
        </div>
      </div>

      <Button onClick={onSwitch} disabled={isSwitching} className="w-auto whitespace-nowrap">
        {isSwitching ? 'Opening...' : 'Open Control Room'}
      </Button>
    </div>
  </div>
)
