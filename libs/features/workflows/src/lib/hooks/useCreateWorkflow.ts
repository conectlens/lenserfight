import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useLenser } from '@lenserfight/features/profile'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import type { WorkflowRecord, CreateWorkflowInput } from '@lenserfight/data/repositories'

export type CreateWorkflowValues = CreateWorkflowInput

export const useCreateWorkflow = () => {
  const { lenser } = useLenser()
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (input: CreateWorkflowValues): Promise<WorkflowRecord> => {
    if (!lenser?.id) {
      const msg = 'You need a lenser profile to create a workflow.'
      setError(msg)
      throw new Error(msg)
    }

    setIsSubmitting(true)
    setError(null)
    try {
      const workflow = await workflowsService.createWorkflow({
        title: input.title,
        description: input.description,
        visibility: input.visibility ?? 'public',
      })

      queryClient.setQueryData(queryKeys.workflows.detail(workflow.id), workflow)
      await queryClient.invalidateQueries({ queryKey: queryKeys.workflows.byLenser(lenser.id) })
      return workflow
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to create workflow.'
      setError(msg)
      throw e
    } finally {
      setIsSubmitting(false)
    }
  }

  return { submit, isSubmitting, error }
}
