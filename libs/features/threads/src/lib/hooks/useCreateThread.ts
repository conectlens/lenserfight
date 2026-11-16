import { useState } from 'react'

import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { mediaService, threadsService } from '@lenserfight/data/repositories'
import { buildStorageObjectFileName } from '@lenserfight/utils/text'
import type { UnifiedMediaType, Visibility } from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'
import type { PendingThreadMedia } from '../components/ThreadMediaPicker'

function guessMediaType(mimeType: string): UnifiedMediaType {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType === 'application/pdf') return 'document'
  if (mimeType.startsWith('text/')) return 'text'
  if (mimeType.includes('json')) return 'json'
  return 'binary'
}

export const useCreateThread = () => {
  const { lenser } = useAuthenticatedLenser()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createThread = async (
    title: string,
    content: string,
    tags: string[],
    visibility: Visibility,
    onSuccess: (id: string) => void,
    editId?: string | null,
    pendingMedia?: PendingThreadMedia | null
  ) => {
    if (!lenser) {
      setError('You must have a Lenser profile to post.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // ── Step 1: resolve media objectId (upload if needed) ─────────────────
      let mediaObjectId: string | null = null

      if (pendingMedia) {
        if (pendingMedia.kind === 'file') {
          const { file } = pendingMedia
          const workspaceId = await mediaService.getPersonalWorkspaceId()
          if (!workspaceId) throw new Error('Could not resolve workspace for media upload.')

          const mediaType = guessMediaType(file.type)
          const bucket = 'user-media'
          // The object key must survive signing and the subsequent PUT byte for
          // byte; a raw filename with spaces or unicode punctuation signs fine
          // and then fails the upload with a 400. `name` below keeps the
          // original filename for display — only the storage key is reduced.
          const objectKey = `${lenser.id}/thread-media/${buildStorageObjectFileName(file.name, Date.now())}`
          const session = await mediaService.startUpload(
            { mediaType, mimeType: file.type, name: file.name },
            workspaceId,
            bucket,
            objectKey
          )

          const uploadResponse = await fetch(session.signedUploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file,
          })
          if (!uploadResponse.ok) {
            throw new Error(`Media upload failed (${uploadResponse.status}).`)
          }

          await mediaService.finalizeUpload(session.objectId, bucket, objectKey, file.size)
          mediaObjectId = session.objectId
        } else {
          mediaObjectId = pendingMedia.mediaObject.id
        }
      }

      // ── Step 2: create or update the thread ───────────────────────────────
      let resultId: string
      if (editId) {
        const updated = await threadsService.updateThread(
          editId,
          { title, content, tagIds: tags, visibility },
          lenser.id
        )
        resultId = updated.id
      } else {
        const created = await threadsService.createThread({
          title,
          content,
          tagIds: tags,
          visibility,
        })
        resultId = created.id
      }

      // ── Step 3: bind media attachment (best-effort) ───────────────────────
      if (mediaObjectId) {
        await mediaService.bindAttachment(mediaObjectId, 'thread', resultId, 'media').catch(() => {
          // Non-fatal: thread is created; attachment will be visible in media gallery.
        })
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.threads.feed() })
      if (lenser?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.threads.personal(lenser.id) })
      }
      if (editId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.threads.detail(editId) })
      }

      setIsSubmitting(false)
      onSuccess(resultId)
    } catch (err: any) {
      setError(err.message || 'Failed to save thread.')
      setIsSubmitting(false)
    }
  }

  return {
    createThread,
    isSubmitting,
    error,
  }
}
