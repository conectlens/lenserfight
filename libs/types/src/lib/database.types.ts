// AUTO-GENERATED — do not hand-edit.
// Re-generate with: pnpm supabase:gen:types
// Requires local Supabase stack: pnpm supabase:db:reset first.
// Format follows the standard output of `supabase gen types typescript`.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  lensers: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string | null
          handle: string
          display_name: string
          bio: string | null
          headline: string | null
          avatar_url: string | null
          banner_url: string | null
          location: string | null
          website_url: string | null
          status: 'active' | 'inactive' | 'deleted' | 'deactivated' | 'pending_deletion'
          visibility: 'public' | 'private' | 'community'
          is_in_waiting_list: boolean
          deletion_requested_at: string | null
          deletion_deadline_at: string | null
          last_handle_changed_at: string | null
          join_order: number | null
          last_login_at: string | null
          last_active_at: string | null
          login_count: number
          onboarding_step: number
          onboarding_completed_at: string | null
          type: 'human' | 'ai'
          ai_model_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          handle: string
          display_name: string
          bio?: string | null
          headline?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          location?: string | null
          website_url?: string | null
          status?: 'active' | 'inactive' | 'deleted' | 'deactivated' | 'pending_deletion'
          visibility?: 'public' | 'private' | 'community'
          is_in_waiting_list?: boolean
          deletion_requested_at?: string | null
          deletion_deadline_at?: string | null
          type?: 'human' | 'ai'
          onboarding_step?: number
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['lensers']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
          status: 'active' | 'pending' | 'rejected'
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
          status?: 'active' | 'pending' | 'rejected'
        }
        Update: Partial<Database['lensers']['Tables']['follows']['Insert']>
        Relationships: [
          { foreignKeyName: 'follows_follower_id_fkey'; columns: ['follower_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] },
          { foreignKeyName: 'follows_following_id_fkey'; columns: ['following_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      blocks: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: { id?: string; blocker_id: string; blocked_id: string; created_at?: string }
        Update: Partial<Database['lensers']['Tables']['blocks']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      lenser_status: 'active' | 'inactive' | 'deleted' | 'deactivated' | 'pending_deletion'
      lenser_type: 'human' | 'ai'
      lenser_visibility: 'public' | 'private' | 'community'
    }
    CompositeTypes: Record<string, never>
  }
  lenses: {
    Tables: {
      lenses: {
        Row: {
          id: string
          lenser_id: string
          title: string
          description: string | null
          content: string
          visibility: 'public' | 'community' | 'private'
          status: 'draft' | 'published' | 'archived'
          reaction_totals: Json
          tags: Json
          author_profile: Json
          parent_lens_id: string | null
          forked_from_execution_id: string | null
          params: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lenser_id: string
          title: string
          description?: string | null
          content: string
          visibility?: 'public' | 'community' | 'private'
          status?: 'draft' | 'published' | 'archived'
          reaction_totals?: Json
          tags?: Json
          author_profile?: Json
          parent_lens_id?: string | null
          forked_from_execution_id?: string | null
          params?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['lenses']['Tables']['lenses']['Insert']>
        Relationships: [
          { foreignKeyName: 'lenses_lenser_id_fkey'; columns: ['lenser_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      versions: {
        Row: {
          id: string
          lens_id: string
          version_number: number
          title: string
          content: string
          is_published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lens_id: string
          version_number?: number
          title: string
          content: string
          is_published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['lenses']['Tables']['versions']['Insert']>
        Relationships: [
          { foreignKeyName: 'versions_lens_id_fkey'; columns: ['lens_id']; referencedRelation: 'lenses'; referencedColumns: ['id'] }
        ]
      }
      workflows: {
        Row: {
          id: string
          lenser_id: string
          title: string
          description: string | null
          visibility: 'public' | 'private' | 'unlisted'
          battle_count: number
          fork_count: number
          reaction_totals: Json
          parent_workflow_id: string | null
          head_version_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lenser_id: string
          title: string
          description?: string | null
          visibility?: 'public' | 'private' | 'unlisted'
          battle_count?: number
          fork_count?: number
          reaction_totals?: Json
          parent_workflow_id?: string | null
          head_version_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['lenses']['Tables']['workflows']['Insert']>
        Relationships: []
      }
      workflow_nodes: {
        Row: {
          id: string
          workflow_id: string
          lens_id: string | null
          version_id: string | null
          position_x: number
          position_y: number
          label: string | null
          ordinal: number
          config: Json
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          lens_id?: string | null
          version_id?: string | null
          position_x?: number
          position_y?: number
          label?: string | null
          ordinal?: number
          config?: Json
          created_at?: string
        }
        Update: Partial<Database['lenses']['Tables']['workflow_nodes']['Insert']>
        Relationships: [
          { foreignKeyName: 'workflow_nodes_workflow_id_fkey'; columns: ['workflow_id']; referencedRelation: 'workflows'; referencedColumns: ['id'] }
        ]
      }
      workflow_edges: {
        Row: {
          id: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          source_output_key: string
          target_param_label: string
        }
        Insert: {
          id?: string
          workflow_id: string
          source_node_id: string
          target_node_id: string
          source_output_key?: string
          target_param_label: string
        }
        Update: Partial<Database['lenses']['Tables']['workflow_edges']['Insert']>
        Relationships: [
          { foreignKeyName: 'workflow_edges_workflow_id_fkey'; columns: ['workflow_id']; referencedRelation: 'workflows'; referencedColumns: ['id'] }
        ]
      }
      workflow_runs: {
        Row: {
          id: string
          workflow_id: string
          triggered_by: string | null
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          context_inputs: Json
          started_at: string | null
          completed_at: string | null
          global_model_id: string | null
          budget_credits: number | null
          spent_credits: number
          cost_metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          workflow_id: string
          triggered_by?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          context_inputs?: Json
          started_at?: string | null
          completed_at?: string | null
          global_model_id?: string | null
          budget_credits?: number | null
          spent_credits?: number
          cost_metadata?: Json
          created_at?: string
        }
        Update: Partial<Database['lenses']['Tables']['workflow_runs']['Insert']>
        Relationships: [
          { foreignKeyName: 'workflow_runs_workflow_id_fkey'; columns: ['workflow_id']; referencedRelation: 'workflows'; referencedColumns: ['id'] }
        ]
      }
      workflow_node_results: {
        Row: {
          id: string
          run_id: string
          node_id: string
          execution_run_id: string | null
          status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          output_data: Json | null
          error_message: string | null
          started_at: string | null
          completed_at: string | null
          input_tokens: number
          output_tokens: number
          cost_credits: number
        }
        Insert: {
          id?: string
          run_id: string
          node_id: string
          execution_run_id?: string | null
          status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
          output_data?: Json | null
          error_message?: string | null
          started_at?: string | null
          completed_at?: string | null
          input_tokens?: number
          output_tokens?: number
          cost_credits?: number
        }
        Update: Partial<Database['lenses']['Tables']['workflow_node_results']['Insert']>
        Relationships: [
          { foreignKeyName: 'wnr_run_id_fkey'; columns: ['run_id']; referencedRelation: 'workflow_runs'; referencedColumns: ['id'] }
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  agents: {
    Tables: {
      ai_lensers: {
        Row: {
          id: string
          profile_id: string
          runtime_pref: 'cloud' | 'local' | 'hybrid'
          is_active: boolean
          suspended_at: string | null
          suspended_reason: string | null
          personality_note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          runtime_pref?: 'cloud' | 'local' | 'hybrid'
          is_active?: boolean
          suspended_at?: string | null
          suspended_reason?: string | null
          personality_note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['agents']['Tables']['ai_lensers']['Insert']>
        Relationships: [
          { foreignKeyName: 'ai_lensers_profile_id_fkey'; columns: ['profile_id']; referencedRelation: 'profiles'; referencedColumns: ['id'] }
        ]
      }
      policies: {
        Row: {
          id: string
          ai_lenser_id: string
          can_join_battles: boolean
          can_vote: boolean
          can_create_battles: boolean
          can_receive_sponsorship: boolean
          model_binding_mode: 'single' | 'multi' | 'dynamic'
          max_daily_battles: number
          max_daily_votes: number
          allowed_battle_types: string[]
          spending_limit_credits: number
          is_public_policy: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          ai_lenser_id: string
          can_join_battles?: boolean
          can_vote?: boolean
          can_create_battles?: boolean
          can_receive_sponsorship?: boolean
          model_binding_mode?: 'single' | 'multi' | 'dynamic'
          max_daily_battles?: number
          max_daily_votes?: number
          allowed_battle_types?: string[]
          spending_limit_credits?: number
          is_public_policy?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['agents']['Tables']['policies']['Insert']>
        Relationships: []
      }
      lens_bindings: {
        Row: {
          id: string
          ai_lenser_id: string
          lens_id: string
          is_main: boolean
          created_at: string
        }
        Insert: { id?: string; ai_lenser_id: string; lens_id: string; is_main?: boolean; created_at?: string }
        Update: Partial<Database['agents']['Tables']['lens_bindings']['Insert']>
        Relationships: []
      }
      model_bindings: {
        Row: {
          id: string
          ai_lenser_id: string
          model_id: string
          is_default: boolean
          category_tags: string[]
          created_at: string
        }
        Insert: { id?: string; ai_lenser_id: string; model_id: string; is_default?: boolean; category_tags?: string[]; created_at?: string }
        Update: Partial<Database['agents']['Tables']['model_bindings']['Insert']>
        Relationships: []
      }
      ownerships: {
        Row: {
          id: string
          ai_lenser_id: string
          owner_lenser_id: string
          role: 'owner' | 'co_owner' | 'operator'
          permission_scope: string[]
          granted_at: string
          revoked_at: string | null
        }
        Insert: {
          id?: string
          ai_lenser_id: string
          owner_lenser_id: string
          role?: 'owner' | 'co_owner' | 'operator'
          permission_scope?: string[]
          granted_at?: string
          revoked_at?: string | null
        }
        Update: Partial<Database['agents']['Tables']['ownerships']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  media: {
    Tables: {
      objects: {
        Row: {
          id: string
          bucket: string
          object_key: string
          size_bytes: number
          mime_type: string
          storage_url: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bucket: string
          object_key: string
          size_bytes?: number
          mime_type?: string
          storage_url: string
          created_by?: string | null
          created_at?: string
        }
        Update: Partial<Database['media']['Tables']['objects']['Insert']>
        Relationships: []
      }
      attachments: {
        Row: {
          id: string
          object_id: string
          entity_type: string
          entity_id: string
          binding_key: string
          attached_by: string | null
          attached_at: string
        }
        Insert: {
          id?: string
          object_id: string
          entity_type: string
          entity_id: string
          binding_key?: string
          attached_by?: string | null
          attached_at?: string
        }
        Update: Partial<Database['media']['Tables']['attachments']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
  tenancy: {
    Tables: {
      workspaces: {
        Row: {
          id: string
          owner_lenser_id: string
          name: string
          slug: string
          description: string | null
          avatar_url: string | null
          plan: string
          is_personal: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_lenser_id: string
          name: string
          slug: string
          description?: string | null
          avatar_url?: string | null
          plan?: string
          is_personal?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['tenancy']['Tables']['workspaces']['Insert']>
        Relationships: []
      }
      workspace_members: {
        Row: {
          workspace_id: string
          lenser_id: string
          role: string
          joined_at: string
        }
        Insert: { workspace_id: string; lenser_id: string; role?: string; joined_at?: string }
        Update: Partial<Database['tenancy']['Tables']['workspace_members']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
