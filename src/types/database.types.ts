
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      xp_totals: {
        Row: {
          lenser_id: string
          app_id: string
          total_xp: number
          current_level: number
          updated_at: string
        }
      }
      xp_levels: {
        Row: {
          id: number
          app_id: string
          level: number
          min_total_xp: number
          max_total_xp: number
          metadata: Json | null
        }
      }
      lenser_badges: {
        Row: {
          id: string
          lenser_id: string
          type: string
          category: string
          label: string
          description: string | null
          icon: string | null
          awarded_at: string
        }
      }
      xp_events: {
        Row: {
          id: string
          lenser_id: string
          action_key: string
          xp: number
          source: string
          created_at: string
        }
      }
    }
    Views: {
      vw_xp_leaderboard_global: {
        Row: {
          lenser_id: string
          total_xp: number
          current_level: number
          rank: number
        }
      }
    }
    Functions: {
      grant_xp: {
        Args: {
          p_lenser_id: string
          p_app_id: string
          p_action_key: string
          p_source: string
          p_source_ref_type?: string
          p_source_ref_id?: string
          p_meta?: Json
        }
        Returns: {
          event_id: string
          total_xp: number
          level: number
          created_at: string
        }[]
      }
    }
  }
}
