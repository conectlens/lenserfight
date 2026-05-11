import { supabase } from '@lenserfight/data/supabase'
import type {
  RecordRunIncidentInput,
  RunIncidentRecord,
  RunReportRecord,
} from '@lenserfight/types'

export interface ListRunReportsOptions {
  limit?: number
  outcome?: string
}

export interface ListRunIncidentsOptions {
  severity?: string
  resolved?: boolean
  limit?: number
}

export interface RunReportsRepository {
  listRunReports(
    aiLenserId: string,
    options?: ListRunReportsOptions
  ): Promise<RunReportRecord[]>
  getRunReport(reportId: string): Promise<RunReportRecord | null>
  createRunReport(teamRunId: string): Promise<string>
  listRunIncidents(
    runReportId: string,
    options?: ListRunIncidentsOptions
  ): Promise<RunIncidentRecord[]>
  recordRunIncident(input: RecordRunIncidentInput): Promise<string>
  resolveIncident(incidentId: string, resolution: string): Promise<void>
}

export class SupabaseRunReportsRepository implements RunReportsRepository {
  async listRunReports(
    aiLenserId: string,
    options: ListRunReportsOptions = {}
  ): Promise<RunReportRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_run_reports', {
      p_ai_lenser_id: aiLenserId,
      p_limit: options.limit && options.limit > 0 ? options.limit : 100,
      p_cursor: null,
    })
    if (error) throw error
    let rows = (data ?? []) as RunReportRecord[]
    if (options.outcome) rows = rows.filter((r) => (r as unknown as Record<string, unknown>)['outcome'] === options.outcome)
    return rows
  }

  async getRunReport(reportId: string): Promise<RunReportRecord | null> {
    const { data, error } = await supabase.rpc('fn_get_run_report', {
      p_report_id: reportId,
    })
    if (error) throw error
    return (data ?? null) as RunReportRecord | null
  }

  async createRunReport(teamRunId: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_create_run_report', {
      p_team_run_id: teamRunId,
    })
    if (error) throw error
    return data as string
  }

  async listRunIncidents(
    runReportId: string,
    options: ListRunIncidentsOptions = {}
  ): Promise<RunIncidentRecord[]> {
    const { data, error } = await supabase.rpc('fn_list_run_incidents', {
      p_run_report_id: runReportId,
      p_severity: options.severity ?? null,
      p_resolved: options.resolved ?? null,
      p_limit: options.limit ?? 100,
    })
    if (error) throw error
    return (data ?? []) as RunIncidentRecord[]
  }

  async recordRunIncident(input: RecordRunIncidentInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_record_run_incident', {
      p_run_report_id: input.run_report_id,
      p_incident_type: input.incident_type,
      p_severity: input.severity,
      p_title: input.title,
      p_description: input.description ?? null,
      p_context: input.context ?? {},
    })
    if (error) throw error
    return data as string
  }

  async resolveIncident(incidentId: string, resolution: string): Promise<void> {
    const { error } = await supabase.rpc('fn_resolve_run_incident', {
      p_incident_id: incidentId,
      p_resolution: resolution,
    })
    if (error) throw error
  }
}
