import { agentsService } from '@lenserfight/data/repositories'
import { queryKeys } from '@lenserfight/data/cache'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Controller hook for agent personality management.
 *
 * Exposes savePersonalityNote and bindLens, each of which
 * invalidates the agent detail cache on success.
 */
export const useAgentPersonality = (aiLenserId: string) => {
  const queryClient = useQueryClient()
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const savePersonalityNote = async (note: string | null): Promise<void> => {
    if (!aiLenserId) return
    setIsSaving(true)
    setError(null)
    try {
      await agentsService.updatePersonality(aiLenserId, note)
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(aiLenserId) })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to save personality.'
      setError(msg)
      throw e
    } finally {
      setIsSaving(false)
    }
  }

  const bindLens = async (lensId: string, versionId?: string | null): Promise<void> => {
    if (!aiLenserId || !lensId) return
    setIsSaving(true)
    setError(null)
    try {
      await agentsService.setMainLensBinding(aiLenserId, lensId, versionId)
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(aiLenserId) })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to bind lens.'
      setError(msg)
      throw e
    } finally {
      setIsSaving(false)
    }
  }

  return { savePersonalityNote, bindLens, isSaving, error }
}
