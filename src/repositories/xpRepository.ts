
import { XPSummary, XPEvent, LenserBadge, LeaderboardEntry, GrantXPDTO } from '../types/xp.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface XPRepositoryPort {
  getXPSummary(lenserId: string): Promise<XPSummary | null>;
  getHistory(lenserId: string, limit?: number): Promise<XPEvent[]>;
  getBadges(lenserId: string): Promise<LenserBadge[]>;
  getGlobalLeaderboard(limit?: number): Promise<LeaderboardEntry[]>;
  grantXP(dto: GrantXPDTO): Promise<XPSummary>;
}

// --- Mock Implementation ---
export class MockXPRepository implements XPRepositoryPort {
  private STORAGE_KEY = 'mock_xp_data';

  private getData() {
    const data = storage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { totalXp: 1250, currentLevel: 3, history: [], badges: [] };
  }

  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const data = this.getData();
    return {
      totalXp: data.totalXp,
      currentLevel: data.currentLevel,
      rank: 42
    };
  }

  async getHistory(lenserId: string, limit = 10): Promise<XPEvent[]> {
    return this.getData().history.slice(0, limit);
  }

  async getBadges(lenserId: string): Promise<LenserBadge[]> {
    return [
      { id: 'b1', type: 'LEVEL_5', label: 'Rising Star', description: 'Reached Level 5', awardedAt: new Date().toISOString() }
    ];
  }

  async getGlobalLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    return Array.from({ length: 5 }).map((_, i) => ({
      rank: i + 1,
      lenserId: `user-${i}`,
      displayName: `Lenser ${i + 1}`,
      totalXp: 5000 - (i * 100),
      level: 10
    }));
  }

  async grantXP(dto: GrantXPDTO): Promise<XPSummary> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = this.getData();
    
    // Simulate rule XP values
    const xpMap: Record<string, number> = { 
        'THREAD_CREATED': 50, 
        'THREAD_REPLY_CREATED': 20, 
        'REACTION_GIVEN': 5,
        'THREAD_ENGAGED': 1,
        'DAILY_LOGIN': 10,
        'THREAD_REPLY_RECEIVED': 5
    };
    const amount = xpMap[dto.ruleKey] || 10;

    data.totalXp += amount;
    // Simple level curve: Level = floor(sqrt(XP / 100))
    data.currentLevel = Math.floor(Math.sqrt(data.totalXp / 100)) || 1;
    
    data.history.unshift({
        id: `evt-${Date.now()}`,
        action: dto.ruleKey,
        xp: amount,
        source: dto.source,
        createdAt: new Date().toISOString()
    });

    storage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    return { totalXp: data.totalXp, currentLevel: data.currentLevel };
  }
}

// --- Supabase Implementation ---
export class SupabaseXPRepository implements XPRepositoryPort {
  
  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    // 1. Get Totals
    const { data: totals, error } = await supabase
      .from('xp_totals')
      .select('total_xp, current_level')
      .eq('lenser_id', lenserId)
      .maybeSingle();

    if (error) throw error;
    if (!totals) return { totalXp: 0, currentLevel: 1, rank: 0 };

    // 2. Get Rank (Optional: could be separate call if expensive)
    const { data: rankData } = await supabase
      .from('vw_xp_leaderboard_global')
      .select('rank')
      .eq('lenser_id', lenserId)
      .maybeSingle();

    return {
      totalXp: totals.total_xp,
      currentLevel: totals.current_level,
      rank: rankData?.rank
    };
  }

  async getHistory(lenserId: string, limit = 20): Promise<XPEvent[]> {
    const { data, error } = await supabase
      .from('xp_events')
      .select('id, rule_key, xp, source, created_at')
      .eq('lenser_id', lenserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(row => ({
      id: row.id,
      action: row.rule_key,
      xp: row.xp,
      source: row.source,
      createdAt: row.created_at
    }));
  }

  async getBadges(lenserId: string): Promise<LenserBadge[]> {
    const { data, error } = await supabase
      .from('lenser_badges')
      .select('*')
      .eq('lenser_id', lenserId)
      .order('awarded_at', { ascending: false });

    if (error) throw error;

    return data.map(b => ({
      id: b.id,
      type: b.type,
      label: b.label,
      description: b.description || undefined,
      icon: b.icon || undefined,
      awardedAt: b.awarded_at
    }));
  }

  async getGlobalLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    // Join with lensers table to get profile info
    // Note: This relies on lenser_id foreign key relationship
    const { data, error } = await supabase
      .from('vw_xp_leaderboard_global')
      .select(`
        rank,
        lenser_id,
        total_xp,
        current_level,
        lenser:lensers!lenser_id(display_name, avatar_url, handle)
      `)
      .order('rank', { ascending: true })
      .limit(limit);

    if (error) throw error;

    return data.map((row: any) => ({
      rank: row.rank,
      lenserId: row.lenser_id,
      totalXp: row.total_xp,
      level: row.current_level,
      displayName: row.lenser?.display_name || 'Unknown Lenser',
      avatarUrl: row.lenser?.avatar_url
    }));
  }

  async grantXP(dto: GrantXPDTO): Promise<XPSummary> {
    // Call the Secure RPC
    // RLS check happens inside the RPC (it uses auth.uid() if not passed, or we pass it explicitly)
    const { data, error } = await supabase.rpc('grant_xp', {
      p_lenser_id: dto.lenserId,
      p_app_id: dto.appId,
      p_rule_key: dto.ruleKey,
      p_source: dto.source,
      p_source_ref_type: dto.refType,
      p_source_ref_id: dto.refId
    });

    if (error) throw error;

    // RPC returns the new state
    const result = data[0]; 
    return {
      totalXp: result.total_xp,
      currentLevel: result.level
    };
  }
}
