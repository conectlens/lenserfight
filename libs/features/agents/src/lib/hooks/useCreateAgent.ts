import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@lenserfight/data/cache'
import { agentsService } from '@lenserfight/data/repositories'
import { CreateAILenserResult } from '@lenserfight/types'

export const useCreateAgent = (ownerLenserId: string) => {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (handle: string, displayName: string): Promise<CreateAILenserResult> => {
    setIsSubmitting(true)
    setError(null)
    try {
      const result = await agentsService.createAgent({
        owner_lenser_id: ownerLenserId,
        handle,
        display_name: displayName,
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.all })
      return result
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create agent.'
      setError(msg)
      throw e
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting, error }
}
