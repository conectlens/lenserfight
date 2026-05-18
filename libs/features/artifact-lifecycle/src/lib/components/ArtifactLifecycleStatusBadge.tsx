import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@lenserfight/ui/components'

export interface ArtifactLifecycleStatusBadgeProps {
  archivedAt: string | null | undefined
  deletedAt: string | null | undefined
  pinned: boolean
  className?: string
}

export const ArtifactLifecycleStatusBadge: React.FC<ArtifactLifecycleStatusBadgeProps> = ({
  archivedAt,
  deletedAt,
  pinned,
  className,
}) => {
  if (!archivedAt && !deletedAt && !pinned) return null

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      {deletedAt ? (
        <Badge color="red" variant="outline">Deleted</Badge>
      ) : archivedAt ? (
        <Badge color="gray" variant="outline">Archived</Badge>
      ) : null}
      {pinned && (
        <Badge color="yellow" variant="solid">
          <Pin size={10} className="mr-1" />
          Pinned
        </Badge>
      )}
    </span>
  )
}
