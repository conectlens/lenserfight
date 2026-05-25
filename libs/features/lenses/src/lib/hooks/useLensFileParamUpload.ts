import { useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'

import { mediaService } from '@lenserfight/data/repositories'
import { useAuth } from '@lenserfight/features/auth'
import type { LensVersionParam } from '@lenserfight/types'
import { generateUUID } from '@lenserfight/utils/text'

import {
  appendFileParamId,
  removeFileParamId,
  validateLensFileBeforeUpload,
} from '../utils/validateLensFileUpload'
import { useResourceAttachments } from './useResourceAttachments'

/**
 * Upload handler for `file` and `files` lens version parameters in the lab run panel.
 */
export function useLensFileParamUpload(versionId: string | null | undefined) {
  const { user } = useAuth()
  const { data: workspaceId } = useQuery({
    queryKey: ['personalWorkspaceId'],
    queryFn: () => mediaService.getPersonalWorkspaceId(),
    staleTime: 1000 * 60 * 5,
  })

  const { uploadAndAttach, uploadProgress, unbindAttachmentObject } = useResourceAttachments(
    versionId,
    workspaceId ?? null,
    user?.id,
  )

  const uploadFileParam = useCallback(
    async (bindingKey: string, file: File): Promise<string> => {
      if (!versionId) {
        throw new Error('Lens version is not ready yet. Wait for the page to finish loading.')
      }
      if (!workspaceId) {
        throw new Error('Workspace not available. Sign in and try again.')
      }
      return uploadAndAttach(file, bindingKey, 'lens-resources', user?.id, generateUUID())
    },
    [versionId, workspaceId, user?.id, uploadAndAttach],
  )

  const uploadFilesParamAppend = useCallback(
    async (
      param: LensVersionParam,
      file: File,
      currentIds: string[],
      allValues: Record<string, unknown>,
      allParams: LensVersionParam[],
    ): Promise<string[]> => {
      const err = validateLensFileBeforeUpload(file, param, currentIds, allValues, allParams)
      if (err) throw new Error(err)

      const objectId = await uploadFileParam(param.label, file)
      return appendFileParamId(currentIds, objectId)
    },
    [uploadFileParam],
  )

  const removeFilesParamObject = useCallback(
    async (bindingKey: string, objectId: string, current: unknown): Promise<string[]> => {
      if (versionId) {
        await unbindAttachmentObject(bindingKey, objectId)
      }
      return removeFileParamId(current, objectId)
    },
    [versionId, unbindAttachmentObject],
  )

  return {
    uploadFileParam,
    uploadFilesParamAppend,
    removeFilesParamObject,
    uploadProgress,
    isUploadReady: !!versionId && !!workspaceId && !!user?.id,
  }
}
