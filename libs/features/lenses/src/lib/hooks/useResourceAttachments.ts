import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mediaService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { CreateMediaObjectDTO } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'
import { buildLensResourceObjectKey } from '../utils/lensStorageObjectKey'

export const useVersionResources = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.media.forEntity('lens_version', versionId ?? ''),
    queryFn: () => mediaService.getAttachmentsForEntity('lens_version', versionId!),
    enabled: !!versionId,
    staleTime: 30_000,
  })
}

/**
 * Manages the full media upload + attach lifecycle for a version's named slot.
 *
 * Upload flow:
 *   1. startUpload(file, bindingKey) — creates media object row, gets signed URL
 *   2. Browser uploads to storage using the signed URL (via storage adapter)
 *   3. finalizeAndBind — finalizes the storage path + binds attachment to entity
 */
export const useResourceAttachments = (
  versionId: string | null | undefined,
  workspaceId: string | null | undefined,
  authUserId?: string | null
) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'done' | 'error'>>({})

  const { mutateAsync: bindAttachment, isPending: isAttaching } = useMutation({
    mutationFn: ({
      objectId,
      bindingKey,
    }: {
      objectId: string
      bindingKey: string
    }) => mediaService.bindAttachment(objectId, 'lens_version', versionId!, bindingKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.forEntity('lens_version', versionId ?? '') })
    },
    onError: (err) => toastError(err),
  })

  const { mutateAsync: unbindAttachment, isPending: isDetaching } = useMutation({
    mutationFn: (bindingKey: string) =>
      mediaService.unbindAttachment('lens_version', versionId!, bindingKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.media.forEntity('lens_version', versionId ?? '') })
    },
    onError: (err) => toastError(err),
  })

  const uploadAndAttach = useCallback(
    async (
      file: File,
      bindingKey: string,
      bucket: string = 'lens-resources',
      ownerAuthUserId?: string | null
    ) => {
      if (!versionId) throw new Error('versionId is required')
      if (!workspaceId) throw new Error('workspaceId is required')
      const uid = ownerAuthUserId ?? authUserId
      if (!uid) throw new Error('Sign in required to upload files.')

      setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'uploading' }))

      try {
        const objectKey = buildLensResourceObjectKey(uid, versionId, bindingKey, file.name)
        const dto: CreateMediaObjectDTO = {
          mediaType: file.type.startsWith('image/')
            ? 'image'
            : file.type === 'application/pdf'
              ? 'document'
              : file.type.startsWith('audio/')
                ? 'audio'
                : file.type.startsWith('video/')
                  ? 'video'
                  : 'binary',
          mimeType: file.type,
          name: file.name,
        }

        const session = await mediaService.startUpload(dto, workspaceId, bucket, objectKey)

        const uploadResponse = await fetch(session.signedUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Storage upload failed: ${uploadResponse.status}`)
        }

        await mediaService.finalizeUpload(session.objectId, bucket, objectKey, file.size)
        await bindAttachment({ objectId: session.objectId, bindingKey })

        setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'done' }))
        return session.objectId
      } catch (err) {
        setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'error' }))
        toastError(err)
        throw err
      }
    },
    [versionId, workspaceId, authUserId, bindAttachment, toastError]
  )

  // Backward-compatible aliases
  const attachResource = bindAttachment
  const detachResource = useCallback(
    (bindingKey: string) => unbindAttachment(bindingKey),
    [unbindAttachment]
  )

  return {
    attachResource,
    isAttaching,
    detachResource,
    isDetaching,
    uploadAndAttach,
    uploadProgress,
  }
}
