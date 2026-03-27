import React from 'react'
import { Shield, Rocket, Clock, CheckCircle } from 'lucide-react'
import { Card, Badge, Button } from '@lenserfight/ui/components'
import type { BattleStatus } from '../types/battle.types'

interface BattleCreatorPanelProps {
  battleId: string
  status: BattleStatus
  onPublish: (battleId: string) => void
  isPublishing: boolean
}

const STATUS_CONFIG: Partial<Record<BattleStatus, { label: string; color: 'gray' | 'green' | 'blue' | 'yellow' | 'purple' }>> = {
  draft:    { label: 'Draft',   color: 'gray'   },
  open:     { label: 'Open',    color: 'green'  },
  voting:   { label: 'Voting',  color: 'blue'   },
  scoring:  { label: 'Scoring', color: 'yellow' },
  closed:   { label: 'Closed',  color: 'gray'   },
  published:{ label: 'Published', color: 'purple' },
}

export const BattleCreatorPanel: React.FC<BattleCreatorPanelProps> = ({
  battleId,
  status,
  onPublish,
  isPublishing,
}) => {
  const cfg = STATUS_CONFIG[status]

  return (
    <Card className="space-y-4 border border-dashed border-primary/30 bg-yellow-50/40 dark:bg-yellow-900/10 p-5">
      <div className="flex items-center gap-2">
        <Shield size={16} className="text-primary flex-shrink-0" />
        <span className="text-sm font-semibold text-greyscale-800 dark:text-greyscale-100">Creator Controls</span>
        {cfg && (
          <Badge color={cfg.color} variant="outline" className="ml-auto text-xs">
            {cfg.label}
          </Badge>
        )}
      </div>

      {status === 'draft' && (
        <div className="space-y-3">
          <p className="text-sm text-greyscale-600 dark:text-greyscale-300">
            Publishing opens this battle so contenders can submit their entries. Once published this cannot be undone.
          </p>
          <Button
            onClick={() => onPublish(battleId)}
            disabled={isPublishing}
            isLoading={isPublishing}
            className="flex items-center gap-2 w-auto"
          >
            <Rocket size={14} />
            {isPublishing ? 'Publishing…' : 'Publish Battle'}
          </Button>
        </div>
      )}

      {status === 'open' && (
        <div className="flex items-start gap-3">
          <Clock size={15} className="mt-0.5 text-status-green flex-shrink-0" />
          <p className="text-sm text-greyscale-600 dark:text-greyscale-300">
            Battle is open. Contenders can now submit their entries. The battle will transition to voting once submissions are ready.
          </p>
        </div>
      )}

      {status === 'voting' && (
        <div className="flex items-start gap-3">
          <CheckCircle size={15} className="mt-0.5 text-status-blue flex-shrink-0" />
          <p className="text-sm text-greyscale-600 dark:text-greyscale-300">
            Voting is live. Lensers are casting their votes. Results will be calculated when voting closes.
          </p>
        </div>
      )}

      {(status === 'scoring' || status === 'closed' || status === 'published') && (
        <div className="flex items-start gap-3">
          <CheckCircle size={15} className="mt-0.5 text-greyscale-400 flex-shrink-0" />
          <p className="text-sm text-greyscale-500 dark:text-greyscale-400">
            Battle has concluded. Results are final.
          </p>
        </div>
      )}
    </Card>
  )
}
