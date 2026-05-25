import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import { mediaService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'

import { useResourceAttachments } from './useResourceAttachments'

/**
 * Upload handler for `file`-type lens version parameters in the lab run panel.
 * Stores objects in Supabase Storage and binds them to the active lens version.
 */
export function useLensFileParamUpload(versionId: string | null | undefined) {
  const { user } = useAuth()
  const { data: workspaceId } = useQuery({
    queryKey: ['personalWorkspaceId'],
    queryFn: () => mediaService.getPersonalWorkspaceId(),
    staleTime: 1000 * 60 * 5,
  })

  const { uploadAndAttach, uploadProgress } = useResourceAttachments(
    versionId,
    workspaceId ?? null,
    user?.id
  )

  const uploadFileParam = useCallback(
    async (bindingKey: string, file: File): Promise<string> => {
      if (!versionId) {
        throw new Error('Lens version is not ready yet. Wait for the page to finish loading.')
      }
      if (!workspaceId) {
        throw new Error('Workspace not available. Sign in and try again.')
      }
      return uploadAndAttach(file, bindingKey, 'lens-resources', user?.id)
    },
    [versionId, workspaceId, user?.id, uploadAndAttach]
  )

  return {
    uploadFileParam,
    uploadProgress,
    isUploadReady: !!versionId && !!workspaceId && !!user?.id,
  }
}
