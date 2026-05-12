import { Badge, Button } from '@lenserfight/ui/components'
import { VerifiedLocalBadge } from '@lenserfight/ui/widgets'
import type { BattleSubmissionMetadata } from '@lenserfight/types'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

import { MediaRenderer } from '../../renderers/MediaRenderer'
import { MediaUploadPanel } from './MediaUploadPanel'
import { SubmissionViewer } from './SubmissionViewer'

interface ContenderSlotProps {
  slot: 'A' | 'B'
  displayName: string
  contenderType: 'human' | 'ai_model' | 'ai_agent' | 'ai_runner'
  contentText?: string | null
  contentUrl?: string | null
  voteCount?: number
  votePercentage?: number
  metadata?: BattleSubmissionMetadata | null
  mediaUrl?: string | null
  mimeType?: string | null
  outputModality?: 'text' | 'image' | 'video' | 'audio' | null
  /** Phase BC: when present + the slot has no media yet, show an upload panel. */
  uploadContext?: { battleId: string; contenderId: string } | null
}

export function ContenderSlot({
  slot,
  displayName,
  contenderType,
  contentText,
  contentUrl,
  voteCount,
  votePercentage,
  metadata,
  mediaUrl,
  mimeType,
  outputModality,
  uploadContext,
}: ContenderSlotProps) {
  const isAI = contenderType !== 'human'
  const attestation = metadata?.attestation
  const [showUploader, setShowUploader] = useState(false)
  const canUpload = Boolean(uploadContext) && (!mediaUrl || outputModality === 'text')

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <Badge color={slot === 'A' ? 'blue' : 'yellow'} variant="solid">
          {slot}
        </Badge>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-greyscale-500 dark:text-greyscale-400">{isAI ? 'AI lenser' : 'Human lenser'}</span>
            <span className="h-1 w-1 rounded-full bg-greyscale-300" />
            <span className="text-sm font-semibold text-greyscale-900 dark:text-greyscale-50">{displayName}</span>
            {attestation?.signed && (
              <VerifiedLocalBadge
                signed={attestation.signed}
                gatewayVerified={attestation.gatewayVerified}
                deviceTrusted={attestation.deviceTrusted}
                policyPassed={attestation.policyPassed}
              />
            )}
          </div>
          {voteCount !== undefined && (
            <p className="mt-1 text-xs text-greyscale-500 dark:text-greyscale-400">
              {voteCount} votes {votePercentage !== undefined ? `• ${votePercentage}% share` : ''}
            </p>
          )}
        </div>
      </div>

      {votePercentage !== undefined && (
        <div className="h-2 overflow-hidden rounded-full bg-surface-sunken">
          <motion.div
            className={`h-full rounded-full ${slot === 'A' ? 'bg-primary-yellow-500' : 'bg-primary-yellow-600'}`}
            initial={{ width: '0%' }}
            animate={{ width: `${votePercentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      )}

      {outputModality && outputModality !== 'text' && mediaUrl && (
        <MediaRenderer
          modality={outputModality}
          mediaUrl={mediaUrl}
          mimeType={mimeType ?? null}
          altText={`${displayName} (${slot})`}
        />
      )}

      <SubmissionViewer slot={slot} contenderName={displayName} contentText={contentText} contentUrl={contentUrl} />

      {canUpload && uploadContext && (
        <div className="space-y-2">
          {!showUploader ? (
            <Button size="sm" variant="secondary" onClick={() => setShowUploader(true)}>
              Upload file
            </Button>
          ) : (
            <MediaUploadPanel
              battleId={uploadContext.battleId}
              contenderId={uploadContext.contenderId}
              onSubmitted={() => setShowUploader(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
