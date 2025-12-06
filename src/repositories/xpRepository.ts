
import { XPSummary, XPEvent, LenserBadge, LeaderboardEntry, GrantXPDTO, LeaderboardTimeframe, LeaderboardScope } from '../types/xp.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface XPRepositoryPort {
  getXPSummary(lenserId: string): Promise<XPSummary | null>;
  getHistory(lenserId: string, limit?: number): Promise<XPEvent[]>;
  getBadges(lenserId: string): Promise<LenserBadge[]>;
  getLeaderboard(timeframe: LeaderboardTimeframe, scope: LeaderboardScope, limit?: number, offset?: number): Promise<{ list: LeaderboardEntry[], userEntry?: LeaderboardEntry | null }>;
  grantXP(dto: GrantXPDTO): Promise<XPSummary>;
}

// --- Mock Implementation ---
export class MockXPRepository implements XPRepositoryPort {
  private STORAGE_KEY = 'mock_xp_data';

  private getData() {
    const data = storage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : { totalXp: 1250, currentLevel: 3, history: [], badges: [] };
  }

  private getMockLevelMinXp(level: number): number {
      if (level <= 1) return 0;
      return (level - 1) * (level - 1) * 100;
  }

  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    await new Promise(resolve => setTimeout(resolve, 300));
    const data = this.getData();
    
    const currentMin = this.getMockLevelMinXp(data.currentLevel);
    const nextMin = this.getMockLevelMinXp(data.currentLevel + 1);

    return {
      totalXp: data.totalXp,
      currentLevel: data.currentLevel,
      rank: 42,
      currentLevelMinXp: currentMin,
      nextLevelMinXp: nextMin
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

  async getLeaderboard(timeframe: LeaderboardTimeframe, scope: LeaderboardScope, limit = 50, offset = 0): Promise<{ list: LeaderboardEntry[], userEntry?: LeaderboardEntry | null }> {
    await new Promise(resolve => setTimeout(resolve, 600)); // Simulate realistic load
    
    // Generate deterministic mock data based on timeframe to show filtering works
    const multiplier = timeframe === 'weekly' ? 0.1 : timeframe === 'monthly' ? 0.4 : 1;
    
    const mockUsers = [
        { id: 'cassian', name: 'Cassian', handle: 'cassian.lens', avatar: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff' },
        { id: 'sarah', name: 'Sarah Connor', handle: 'skynet_hunter', avatar: 'https://ui-avatars.com/api/?name=Sarah+Connor&background=e11d48&color=fff' },
        { id: 'neo', name: 'Neo', handle: 'the_one', avatar: 'https://ui-avatars.com/api/?name=Neo&background=000&color=fff' },
        { id: 'trinity', name: 'Trinity', handle: 'matrix_hacker', avatar: 'https://ui-avatars.com/api/?name=Trinity&background=0f172a&color=fff' },
        { id: 'morpheus', name: 'Morpheus', handle: 'dream_king', avatar: 'https://ui-avatars.com/api/?name=Morpheus&background=4f46e5&color=fff' },
    ];

    // Create a larger list of 100 items to support pagination
    const fullList: LeaderboardEntry[] = Array.from({ length: 100 }).map((_, i) => {
        const user = mockUsers[i % mockUsers.length];
        const baseXP = 15000 - (i * 150);
        const adjustedXP = Math.floor(Math.max(0, baseXP) * multiplier);
        
        return {
            rank: i + 1,
            lenserId: i < mockUsers.length ? user.id : `user-${i}`,
            displayName: i < mockUsers.length ? user.name : `Lenser ${i + 1}`,
            handle: i < mockUsers.length ? user.handle : `user_${i+1}`,
            avatarUrl: i < mockUsers.length ? user.avatar : undefined,
            totalXp: adjustedXP,
            level: Math.floor(Math.sqrt(adjustedXP / 100)) + 1,
            streak: Math.floor(Math.random() * 20),
            trend: Math.random() > 0.7 ? 'up' : Math.random() > 0.8 ? 'down' : 'same'
        };
    });

    const paginatedList = fullList.slice(offset, offset + limit);

    // Simulate "Me" being somewhere
    const myData = this.getData();
    const myEntry: LeaderboardEntry = {
        rank: 42,
        lenserId: 'user-1', // Match MockAuth
        displayName: 'Demo User',
        handle: 'demo_user',
        totalXp: Math.floor(myData.totalXp * multiplier),
        level: myData.currentLevel,
        streak: 5,
        trend: 'up'
    };

    return { list: paginatedList, userEntry: myEntry };
  }

  async grantXP(dto: GrantXPDTO): Promise<XPSummary> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = this.getData();
    
    const xpMap: Record<string, number> = { 
        'THREAD_CREATED': 50, 
        'THREAD_REPLY_CREATED': 20, 
        'REACTION_GIVEN': 5,
        'THREAD_ENGAGED': 1,
        'DAILY_LOGIN': 10,
        'THREAD_REPLY_RECEIVED': 5,
        'PROMPT_CREATED': 50
    };
    const amount = xpMap[dto.ruleKey] || 10;

    data.totalXp += amount;
    const newLevel = Math.floor(Math.sqrt(data.totalXp / 100)) + 1;
    data.currentLevel = newLevel;
    
    data.history.unshift({
        id: `evt-${Date.now()}`,
        action: dto.ruleKey,
        xp: amount,
        source: dto.source,
        createdAt: new Date().toISOString()
    });

    storage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    
    const currentMin = this.getMockLevelMinXp(data.currentLevel);
    const nextMin = this.getMockLevelMinXp(data.currentLevel + 1);

    return { 
        totalXp: data.totalXp, 
        currentLevel: data.currentLevel,
        currentLevelMinXp: currentMin,
        nextLevelMinXp: nextMin
    };
  }
}

// --- Supabase Implementation ---
export class SupabaseXPRepository implements XPRepositoryPort {
  private DEFAULT_APP_ID = '00000000-0000-0000-0000-000000000000';

  async getXPSummary(lenserId: string): Promise<XPSummary | null> {
    const { data: totals, error } = await supabase
      .from('xp_totals')
      .select('total_xp, current_level, app_id')
      .eq('lenser_id', lenserId)
      .maybeSingle();

    if (error) throw error;
    
    const currentTotal = totals?.total_xp || 0;
    const currentLevel = totals?.current_level || 1;
    const appId = totals?.app_id || this.DEFAULT_APP_ID;

    const { data: rankData } = await supabase
      .from('vw_xp_leaderboard_global')
      .select('rank')
      .eq('lenser_id', lenserId)
      .maybeSingle();

    const { data: levelsData } = await supabase
        .from('xp_levels')
        .select('level, min_total_xp')
        .eq('app_id', appId)
        .in('level', [currentLevel, currentLevel + 1]);

    const currentLevelInfo = levelsData?.find(l => l.level === currentLevel);
    const nextLevelInfo = levelsData?.find(l => l.level === currentLevel + 1);

    return {
      totalXp: currentTotal,
      currentLevel: currentLevel,
      rank: rankData?.rank,
      currentLevelMinXp: currentLevelInfo?.min_total_xp ?? 0,
      nextLevelMinXp: nextLevelInfo?.min_total_xp 
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

  async getLeaderboard(timeframe: LeaderboardTimeframe, scope: LeaderboardScope, limit = 50, offset = 0): Promise<{ list: LeaderboardEntry[], userEntry?: LeaderboardEntry | null }> {
    const viewName = scope === 'season' ? 'vw_xp_leaderboard_season' : 'vw_xp_leaderboard_global';
    
    // The view returns columns: app_id, rank, lenser_id, total_xp, current_level, user (jsonb)
    // Note: The view includes a UNION for the current user ("me") if they are not in the top list.
    const { data, error } = await supabase
        .from(viewName)
        .select('*')
        .order('rank', { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) throw error;

    // Retrieve current user ID to identify the "me" entry
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    let userEntry: LeaderboardEntry | null = null;
    
    // Map raw data to domain entities
    const allEntries: LeaderboardEntry[] = data.map((row: any) => {
        const userProfile = row.user || {};
        return {
            rank: row.rank,
            lenserId: row.lenser_id,
            totalXp: row.total_xp,
            level: row.current_level,
            displayName: userProfile.display_name || 'Unknown Lenser',
            handle: userProfile.handle,
            avatarUrl: userProfile.avatar_url,
            // View doesn't have streak/trend yet, default these
            streak: 0, 
            trend: 'same'
        };
    });

    // If current user is authenticated, attempt to extract their entry
    if (currentUserId) {
        userEntry = allEntries.find(e => e.lenserId === currentUserId) || null;
    }

    // Filter to strictly top N for the list to avoid Showing "Me" at rank 500 inside the main scrolling list 
    // if I requested page 1 (rank 1-50).
    // The View's UNION appends "Me" regardless of limit/offset if handled naively, but here we applied range() to the result of the view.
    // However, typical usage of this view logic implies the View *internally* limits to 100.
    // If we are paging, we should trust the rank.
    
    return { list: allEntries, userEntry }; 
  }

  async grantXP(dto: GrantXPDTO): Promise<XPSummary> {
    const { data, error } = await supabase.rpc('grant_xp', {
      p_lenser_id: dto.lenserId, 
      p_app_id: dto.appId,
      p_rule_key: dto.ruleKey,
      p_source: dto.source,
      p_source_ref_type: dto.refType,
      p_source_ref_id: dto.refId
    });

    if (error) throw error;

    const result = data[0];
    
    let currentMin = 0;
    let nextMin: number | undefined;

    try {
        const { data: levels } = await supabase
            .from('xp_levels')
            .select('level, min_total_xp')
            .eq('app_id', dto.appId)
            .in('level', [result.level, result.level + 1]);
        
        currentMin = levels?.find(l => l.level === result.level)?.min_total_xp || 0;
        nextMin = levels?.find(l => l.level === result.level + 1)?.min_total_xp;
    } catch (e) {
        // ignore
    }

    return {
      totalXp: result.total_xp,
      currentLevel: result.level,
      currentLevelMinXp: currentMin,
      nextLevelMinXp: nextLevelInfo?.min_total_xp
    };
  }
}
