import { queryKeys } from '@lenserfight/data/cache'
import { SupabaseRunReportsRepository } from '@lenserfight/data/repositories'
import { useQuery } from '@tanstack/react-query'

const repo = new SupabaseRunReportsRepository()

export function useRunReports(aiLenserId: string, limit = 20) {
  return useQuery({
    queryKey: queryKeys.agents.runReports(aiLenserId, limit),
    queryFn: () => repo.listRunReports(aiLenserId, { limit }),
    enabled: !!aiLenserId,
  })
}

export function useRunReport(reportId: string | null) {
  return useQuery({
    queryKey: queryKeys.agents.runReport(reportId ?? ''),
    queryFn: () => repo.getRunReport(reportId!),
    enabled: !!reportId,
  })
}

export function useRunIncidents(runReportId: string | null) {
  return useQuery({
    queryKey: queryKeys.agents.runIncidents(runReportId ?? ''),
    queryFn: () => repo.listRunIncidents(runReportId!),
    enabled: !!runReportId,
  })
}
