
import { LogPageViewDTO } from '../types/analytics.types';
import { supabase } from '../utils/supabase';

export interface AnalyticsRepositoryPort {
  logPageView(dto: LogPageViewDTO): Promise<void>;
}

export class MockAnalyticsRepository implements AnalyticsRepositoryPort {
  async logPageView(dto: LogPageViewDTO): Promise<void> {
    // Simulate network delay
    // await new Promise(resolve => setTimeout(resolve, 100));
    console.groupCollapsed(`[Mock Analytics] Page View: ${dto.targetType} @ ${dto.path}`);
    console.log("Payload:", dto);
    console.groupEnd();
  }
}

export class SupabaseAnalyticsRepository implements AnalyticsRepositoryPort {
  async logPageView(dto: LogPageViewDTO): Promise<void> {
    const { error } = await supabase.rpc("log_page_view", {
      p_lenser_id: dto.lenserId || null,
      p_user_id: dto.userId || null,
      p_target_type: dto.targetType,
      p_target_id: dto.targetId || null,
      p_path: dto.path,
      p_referrer: dto.referrer || null,
      p_user_agent: dto.userAgent,
      p_client_ip: dto.clientIp || null
    });

    if (error) {
      console.error("Failed to log page view:", error);
    }
  }
}
