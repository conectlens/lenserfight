import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@lenserfight/data/supabase'

// AT — Media privacy & governance actions
// Wraps fn_delete_media_object and fn_toggle_media_visibility RPCs.

export function useMediaActions(lenserId: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['media', 'gallery', lenserId] })
  }

  const deleteMutation = useMutation({
    mutationFn: async (objectId: string) => {
      const { error } = await supabase.rpc('fn_delete_media_object', { p_object_id: objectId })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const visibilityMutation = useMutation({
    mutationFn: async ({
      objectId,
      visibility,
    }: {
      objectId: string
      visibility: 'public' | 'private' | 'unlisted'
    }) => {
      const { error } = await supabase.rpc('fn_toggle_media_visibility', {
        p_object_id:  objectId,
        p_visibility: visibility,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return {
    deleteMedia: (objectId: string) => deleteMutation.mutateAsync(objectId),
    toggleVisibility: (objectId: string, visibility: 'public' | 'private' | 'unlisted') =>
      visibilityMutation.mutateAsync({ objectId, visibility }),
    isDeleting: deleteMutation.isPending,
    isUpdatingVisibility: visibilityMutation.isPending,
  }
}
