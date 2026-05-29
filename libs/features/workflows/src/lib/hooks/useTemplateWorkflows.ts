import { workflowsService } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

import type { TemplateWorkflowRecord } from '@lenserfight/data/repositories'

export interface UseTemplateWorkflowsOptions {
  limit?: number
  offset?: number
  search?: string | null
  category?: string | null
}

/**
 * Loads curated workflow templates with bounded server-side search and category
 * filtering. Public + anonymous-friendly so galleries can render before login.
 */
export function useTemplateWorkflows(options: number | UseTemplateWorkflowsOptions = 12) {
  const normalized = typeof options === 'number'
    ? { limit: options, offset: 0, search: null, category: null }
    : {
        limit: options.limit ?? 12,
        offset: options.offset ?? 0,
        search: options.search ?? null,
        category: options.category ?? null,
      }

  return useQuery<TemplateWorkflowRecord[]>({
    queryKey: [
      'workflows',
      'templates',
      normalized.limit,
      normalized.offset,
      normalized.search,
      normalized.category,
    ],
    queryFn: () => workflowsService.listTemplates(normalized.limit, normalized.offset, {
      search: normalized.search,
      category: normalized.category,
    }),
    staleTime: 1000 * 60 * 5,
  })
}
