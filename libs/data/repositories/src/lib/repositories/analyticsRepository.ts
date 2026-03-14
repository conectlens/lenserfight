import { LogPageViewDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface AnalyticsRepositoryPort {
  logPageView(dto: LogPageViewDTO): Promise<void>
}


export class SupabaseAnalyticsRepository implements AnalyticsRepositoryPort {
  async logPageView(dto: LogPageViewDTO): Promise<void> {
    const { error } = await supabase.rpc('fn_log_page_view', {
      p_target_type: dto.targetType,
      p_target_id: dto.targetId || null,
      p_path: dto.path,
      p_referrer: dto.referrer || null,
      p_user_agent: dto.userAgent,
      p_client_ip: dto.clientIp || null,
    })

    if (error) {
      console.error('Failed to log page view:', error)
    }
  }
}
