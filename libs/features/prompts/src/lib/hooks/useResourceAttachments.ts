import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resourcesService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { CreateResourceDTO } from '@lenserfight/types'
import { useToast } from '@lenserfight/shared/error'

export const useVersionResources = (versionId: string | null | undefined) => {
  return useQuery({
    queryKey: queryKeys.resources.forVersion(versionId ?? ''),
    queryFn: () => resourcesService.getForVersion(versionId!),
    enabled: !!versionId,
    staleTime: 30_000,
  })
}

/**
 * Manages the full resource upload + attach lifecycle for a version's named slot.
 *
 * Upload flow:
 *   1. startUpload(file, bindingKey) — creates resource row, gets signed URL
 *   2. Browser uploads to Supabase Storage using the signed URL
 *   3. finalizeAndAttach(resourceId, bucket, objectKey, versionId, bindingKey)
 *      — finalizes the storage path + attaches to version
 */
export const useResourceAttachments = (versionId: string | null | undefined) => {
  const queryClient = useQueryClient()
  const { toastError } = useToast()
  const [uploadProgress, setUploadProgress] = useState<Record<string, 'uploading' | 'done' | 'error'>>({})

  const { mutateAsync: attachResource, isPending: isAttaching } = useMutation({
    mutationFn: ({
      resourceId,
      bindingKey,
    }: {
      resourceId: string
      bindingKey: string
    }) => resourcesService.attachToVersion(versionId!, resourceId, bindingKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.forVersion(versionId ?? '') })
    },
    onError: (err) => toastError(err),
  })

  const { mutateAsync: detachResource, isPending: isDetaching } = useMutation({
    mutationFn: (resourceId: string) => resourcesService.detachFromVersion(versionId!, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.forVersion(versionId ?? '') })
    },
    onError: (err) => toastError(err),
  })

  const uploadAndAttach = useCallback(
    async (
      file: File,
      bindingKey: string,
      bucket: string = 'prompt-resources'
    ) => {
      if (!versionId) throw new Error('versionId is required')

      setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'uploading' }))

      try {
        const objectKey = `${versionId}/${bindingKey}/${file.name}`
        const dto: CreateResourceDTO = {
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

        const session = await resourcesService.startUpload(dto, bucket, objectKey)

        // Direct browser → Supabase Storage upload
        const uploadResponse = await fetch(session.signedUploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        })

        if (!uploadResponse.ok) {
          throw new Error(`Storage upload failed: ${uploadResponse.status}`)
        }

        await resourcesService.finalizeUpload(session.resourceId, bucket, objectKey)
        await attachResource({ resourceId: session.resourceId, bindingKey })

        setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'done' }))
        return session.resourceId
      } catch (err) {
        setUploadProgress((prev) => ({ ...prev, [bindingKey]: 'error' }))
        toastError(err)
        throw err
      }
    },
    [versionId, attachResource, toastError]
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
