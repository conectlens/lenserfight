import { useState } from 'react'

import { useLenser } from '../../../context/LenserContext'
import { threadsService } from '../../../services/threadsService'
import { TagDTO } from '../../../types/tags.types'
import { Visibility } from '../../../types/threads.types'

export const useCreateThread = () => {
  const { lenser } = useLenser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createThread = async (
    title: string,
    content: string,
    tags: TagDTO[],
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
          {
            title,
            content,
            tagIds: tags.map((tag) => tag.slug || tag.name),
            visibility,
            lenserId: lenser.id,
          },
          lenser.id
        )
        resultId = updated.id
      } else {
        const created = await threadsService.createThread({
          title,
          content,
          tagIds: tags.map((tag) => tag.slug || tag.name),
          lenserId: lenser.id,
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
