import { useState } from 'react'

import { threadsService } from '@lenserfight/data/repositories'
import { Visibility } from '@lenserfight/types'
import { useAuthenticatedLenser } from './useAuthenticatedLenser'

export const useCreateThread = () => {
  const { lenser } = useAuthenticatedLenser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createThread = async (
    title: string,
    content: string,
    tags: string[],
    visibility: Visibility,
    onSuccess: (id: string) => void,
    editId?: string | null
  ) => {
    if (!lenser) {
      setError('You must have a Lenser profile to post.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
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

      // Mark as done before calling onSuccess
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
