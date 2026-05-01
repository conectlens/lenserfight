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
    let query = supabase
      .schema('agents')
      .from('run_reports')
      .select('*')
      .eq('ai_lenser_id', aiLenserId)
      .order('created_at', { ascending: false })

    if (options.outcome) query = query.eq('outcome', options.outcome)
    if (options.limit && options.limit > 0) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error
    return (data ?? []) as RunReportRecord[]
  }

  async getRunReport(reportId: string): Promise<RunReportRecord | null> {
    const { data, error } = await supabase
      .schema('agents')
      .from('run_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle()
    if (error) throw error
    return data as RunReportRecord | null
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
    let query = supabase
      .schema('agents')
      .from('run_incidents')
      .select('*')
      .eq('run_report_id', runReportId)
      .order('created_at', { ascending: false })

    if (options.severity) query = query.eq('severity', options.severity)
    if (options.resolved === true) query = query.not('resolved_at', 'is', null)
    if (options.resolved === false) query = query.is('resolved_at', null)
    if (options.limit && options.limit > 0) query = query.limit(options.limit)

    const { data, error } = await query
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
    const { error } = await supabase
      .schema('agents')
      .from('run_incidents')
      .update({ resolved_at: new Date().toISOString(), resolution })
      .eq('id', incidentId)
    if (error) throw error
  }
}
