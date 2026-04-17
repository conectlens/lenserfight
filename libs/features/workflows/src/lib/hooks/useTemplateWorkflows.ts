import { queryKeys } from '@lenserfight/data/cache'
import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { TemplateWorkflowRecord } from '@lenserfight/data/repositories'

/**
 * Loads the curated "Start from template" strip for the WorkflowsPage.
 * Backed by `public.fn_list_template_workflows` (migration
 * 20260417150000_lens_chain_templates.sql). Public + anonymous-friendly so the
 * strip can render before login.
 */
export function useTemplateWorkflows(limit = 12) {
  return useQuery<TemplateWorkflowRecord[]>({
    queryKey: queryKeys.workflows.templates(limit),
    queryFn: () => workflowsService.listTemplates(limit, 0),
    staleTime: 1000 * 60 * 5,
  })
}
