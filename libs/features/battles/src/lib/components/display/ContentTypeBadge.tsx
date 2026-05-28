import { Badge } from '@lenserfight/ui/components'
import {
  Code2,
  Edit,
  FileText,
  Image,
  Map,
  Mic,
  Pencil,
  Swords,
  UserCircle2,
  Video,
  Workflow,
} from 'lucide-react'
import React from 'react'

import type { BadgeColor } from '@lenserfight/ui/components'

export type BattleContentType =
  | 'text'
  | 'code'
  | 'poem'
  | 'drawing'
  | 'image'
  | 'video'
  | 'audio'
  | 'workflow'
  | 'map'
  | 'avatar'
  | 'image_edit'
  | 'kaggle'

interface ContentTypeConfig {
  label: string
  color: BadgeColor
  Icon: React.ElementType
}

const CONFIG: Record<BattleContentType, ContentTypeConfig> = {
  text:       { label: 'Text',       color: 'gray',   Icon: FileText },
  code:       { label: 'Code',       color: 'blue',   Icon: Code2 },
  poem:       { label: 'Poem',       color: 'purple', Icon: FileText },
  drawing:    { label: 'Drawing',    color: 'green',  Icon: Pencil },
  image:      { label: 'Image',      color: 'yellow', Icon: Image },
  video:      { label: 'Video',      color: 'red',    Icon: Video },
  audio:      { label: 'Audio',      color: 'purple', Icon: Mic },
  workflow:   { label: 'Workflow',   color: 'blue',   Icon: Workflow },
  map:        { label: 'Map',        color: 'green',  Icon: Map },
  avatar:     { label: 'Avatar',     color: 'yellow', Icon: UserCircle2 },
  image_edit: { label: 'Image Edit', color: 'yellow', Icon: Edit },
  kaggle:     { label: 'Kaggle',     color: 'blue',   Icon: Swords },
}

export interface ContentTypeBadgeProps {
  contentType: string | null | undefined
  size?: 'sm' | 'md'
}

export function ContentTypeBadge({ contentType, size = 'sm' }: ContentTypeBadgeProps) {
  if (!contentType) return null
  const cfg = CONFIG[contentType as BattleContentType]
  if (!cfg) return null

  const iconSize = size === 'sm' ? 10 : 12

  return (
    <Badge color={cfg.color} size={size} className="flex items-center gap-1 flex-shrink-0">
      <cfg.Icon size={iconSize} aria-hidden="true" />
      {cfg.label}
    </Badge>
  )
}
