import { Avatar, Card } from '@lenserfight/ui/components'
import { formatCount } from '@lenserfight/utils/number'
import { motion } from 'framer-motion'
import { Copy, ImageIcon, Video, Music, Mic } from 'lucide-react'
import React from 'react'

type OutputKind = 'text' | 'image' | 'video' | 'audio' | 'music' | null | undefined

const OUTPUT_KIND_META: Partial<Record<NonNullable<OutputKind>, { label: string; Icon: React.ElementType; className: string }>> = {
  image: { label: 'Image', Icon: ImageIcon, className: 'bg-violet-500/10 text-violet-500' },
  video: { label: 'Video', Icon: Video, className: 'bg-blue-500/10 text-blue-500' },
  audio: { label: 'Audio', Icon: Mic, className: 'bg-orange-500/10 text-orange-500' },
  music: { label: 'Music', Icon: Music, className: 'bg-pink-500/10 text-pink-500' },
}

function OutputKindBadge({ kind }: { kind: OutputKind }) {
  if (!kind || kind === 'text') return null
  const meta = OUTPUT_KIND_META[kind]
  if (!meta) return null
  const { label, Icon, className } = meta
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${className}`}>
      <Icon size={10} aria-hidden="true" />
      {label}
    </span>
  )
}

export interface ArenaLensCardProps {
  href: string
  id: string
  title: string
  description?: string | null
  usageCount: number
  outputKind?: OutputKind
  authorDisplayName?: string | null
  authorHandle?: string | null
  authorAvatarUrl?: string | null
}

const MotionAnchor = motion.a

export function ArenaLensCard({
  href,
  title,
  description,
  usageCount,
  outputKind,
  authorDisplayName,
  authorAvatarUrl,
}: ArenaLensCardProps) {
  return (
    <MotionAnchor
      href={href}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl h-full"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
    >
      <Card className="h-full flex flex-col gap-2 p-4 hover:shadow-xl transition-shadow">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="line-clamp-1 text-sm font-bold text-greyscale-900 dark:text-greyscale-50 leading-tight flex-1 min-w-0">
            {title}
          </h4>
          <OutputKindBadge kind={outputKind} />
        </div>

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs text-greyscale-500 dark:text-greyscale-400 leading-relaxed flex-1">
            {description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1 gap-2">
          {authorDisplayName ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <Avatar
                src={authorAvatarUrl ?? undefined}
                alt={authorDisplayName}
                size="sm"
                className="!w-5 !h-5 flex-shrink-0"
              />
              <span className="text-[11px] text-greyscale-500 dark:text-greyscale-400 truncate">
                {authorDisplayName}
              </span>
            </div>
          ) : (
            <span />
          )}
          <div
            className="flex items-center gap-1 text-[11px] font-semibold text-greyscale-500 dark:text-greyscale-400 flex-shrink-0"
            aria-label={`${usageCount} uses`}
          >
            <Copy size={11} aria-hidden="true" />
            {formatCount(usageCount)}
          </div>
        </div>
      </Card>
    </MotionAnchor>
  )
}
