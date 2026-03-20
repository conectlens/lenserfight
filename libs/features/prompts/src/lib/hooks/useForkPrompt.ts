import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { promptsService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { PromptTemplateDetailViewModel } from '@lenserfight/types'

interface ForkOptions {
  forkedFromExecutionId?: string | null
}

export const useForkPrompt = (sourcePrompt: PromptTemplateDetailViewModel | null) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { mutate: forkPrompt, isPending: isForking, error: forkError } = useMutation({
    mutationFn: async (options: ForkOptions = {}) => {
      if (!sourcePrompt) throw new Error('No source prompt to fork')

      return promptsService.createPrompt({
        title: `Fork of ${sourcePrompt.title}`,
        description: sourcePrompt.description ?? null,
        content: sourcePrompt.content,
        tagIds: sourcePrompt.tags.map((t) => t.id),
        visibility: 'private',
        parentPromptId: sourcePrompt.id,
        forkedFromExecutionId: options.forkedFromExecutionId ?? null,
      })
    },
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.prompts.all })
      navigate(`/len/p/${newPrompt.id}`)
    },
  })

  return { forkPrompt, isForking, forkError }
}
