import { useMutation, useQueryClient } from '@tanstack/react-query'
import { battlesService, threadsService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'

export const usePublishBattle = (battleSlug: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (battleId: string) => {
      const battle = await battlesService.publishBattle(battleId)

      // Create a linked forum thread if one doesn't exist yet
      if (!battle?.forum_thread_id) {
        try {
          const thread = await threadsService.createThread({
            title: battle?.title ?? 'Battle discussion',
            content: battle?.task_prompt ?? '',
            tagIds: [],
            visibility: 'public',
          })
          if (thread?.id) {
            await battlesService.linkForumThread(battleId, thread.id)
          }
        } catch {
          // Non-fatal: battle is published even if thread creation fails
        }
      }

      return battle
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.detail(battleSlug) })
      queryClient.invalidateQueries({ queryKey: queryKeys.battles.all })
    },
  })
}
