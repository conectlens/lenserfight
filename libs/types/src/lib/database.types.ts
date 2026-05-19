export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      notification_aggregates: {
        Row: {
          actor_ids: string[]
          created_at: string
          entity_id: string
          id: string
          notification_id: string | null
          notification_type: string
          recipient_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          actor_ids?: string[]
          created_at?: string
          entity_id: string
          id?: string
          notification_id?: string | null
          notification_type: string
          recipient_id: string
          window_end: string
          window_start?: string
        }
        Update: {
          actor_ids?: string[]
          created_at?: string
          entity_id?: string
          id?: string
          notification_id?: string | null
          notification_type?: string
          recipient_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_aggregates_notification_id_fkey'
            columns: ['notification_id']
            isOneToOne: false
            referencedRelation: 'notifications'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'notification_aggregates_recipient_id_fkey'
            columns: ['recipient_id']
            isOneToOne: false
            referencedRelation: 'vw_auth_lenser'
            referencedColumns: ['lenser_id']
          },
        ]
      }
      notification_preferences: {
        Row: {
          enabled: boolean
          id: string
          lenser_id: string
          notification_type: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          id?: string
          lenser_id: string
          notification_type: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          id?: string
          lenser_id?: string
          notification_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notification_preferences_lenser_id_fkey'
            columns: ['lenser_id']
            isOneToOne: false
            referencedRelation: 'vw_auth_lenser'
            referencedColumns: ['lenser_id']
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string | null
          created_at: string
          id: string
          lenser_id: string
          metadata: Json
          read_at: string | null
          title: string
          type: string
        }
        Insert: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lenser_id: string
          metadata?: Json
          read_at?: string | null
          title: string
          type: string
        }
        Update: {
          action_url?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lenser_id?: string
          metadata?: Json
          read_at?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: 'notifications_lenser_id_fkey'
            columns: ['lenser_id']
            isOneToOne: false
            referencedRelation: 'vw_auth_lenser'
            referencedColumns: ['lenser_id']
          },
        ]
      }
      user_oauth_connections: {
        Row: {
          access_token_id: string
          auth_strategy: string
          capability: string
          connection_label: string
          created_at: string
          expires_at: string | null
          granted_scopes: string[]
          id: string
          is_active: boolean
          lenser_id: string
          provider: string
          provider_config: Json
          ref: string
          refresh_token_id: string | null
          revoked_at: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          access_token_id: string
          auth_strategy?: string
          capability: string
          connection_label: string
          created_at?: string
          expires_at?: string | null
          granted_scopes?: string[]
          id?: string
          is_active?: boolean
          lenser_id: string
          provider: string
          provider_config?: Json
          ref: string
          refresh_token_id?: string | null
          revoked_at?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          access_token_id?: string
          auth_strategy?: string
          capability?: string
          connection_label?: string
          created_at?: string
          expires_at?: string | null
          granted_scopes?: string[]
          id?: string
          is_active?: boolean
          lenser_id?: string
          provider?: string
          provider_config?: Json
          ref?: string
          refresh_token_id?: string | null
          revoked_at?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'user_oauth_connections_lenser_fk'
            columns: ['lenser_id']
            isOneToOne: false
            referencedRelation: 'vw_auth_lenser'
            referencedColumns: ['lenser_id']
          },
        ]
      }
      workflow_integration_credentials: {
        Row: {
          created_at: string
          encrypted_config: string
          id: string
          integration_type: string
          label: string | null
          lenser_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          encrypted_config: string
          id?: string
          integration_type: string
          label?: string | null
          lenser_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          encrypted_config?: string
          id?: string
          integration_type?: string
          label?: string | null
          lenser_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_integration_credentials_lenser_id_fkey'
            columns: ['lenser_id']
            isOneToOne: false
            referencedRelation: 'vw_auth_lenser'
            referencedColumns: ['lenser_id']
          },
        ]
      }
      workflow_kv_store: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          key: string
          run_id: string | null
          value: Json | null
          workflow_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          key: string
          run_id?: string | null
          value?: Json | null
          workflow_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          key?: string
          run_id?: string | null
          value?: Json | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_kv_store_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'vw_workflows'
            referencedColumns: ['id']
          },
        ]
      }
      workflow_webhook_triggers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          secret: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          secret?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'workflow_webhook_triggers_workflow_id_fkey'
            columns: ['workflow_id']
            isOneToOne: false
            referencedRelation: 'vw_workflows'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      contact_messages: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          ip_address: unknown
          kvkk_approved: boolean | null
          lenser_id: string | null
          message: string | null
          name: string | null
          subject: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          ip_address?: unknown
          kvkk_approved?: boolean | null
          lenser_id?: string | null
          message?: string | null
          name?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          ip_address?: unknown
          kvkk_approved?: boolean | null
          lenser_id?: string | null
          message?: string | null
          name?: string | null
          subject?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      v_workflow_run_cost_breakdown: {
        Row: {
          avg_duration_ms: number | null
          avg_ttfb_ms: number | null
          completed_nodes: number | null
          failed_nodes: number | null
          max_duration_ms: number | null
          run_id: string | null
          run_status: string | null
          skipped_nodes: number | null
          total_cost_credits: number | null
          total_input_tokens: number | null
          total_nodes: number | null
          total_output_tokens: number | null
          total_retries: number | null
          triggered_by: string | null
          workflow_id: string | null
        }
        Relationships: []
      }
      v_workflow_run_health: {
        Row: {
          completed_at: string | null
          done_nodes: number | null
          heartbeat_at: string | null
          in_flight_nodes: number | null
          liveness: string | null
          parent_run_id: string | null
          pending_nodes: number | null
          recursion_depth: number | null
          run_id: string | null
          run_worker_id: string | null
          seconds_since_heartbeat: number | null
          started_at: string | null
          status: string | null
          workflow_id: string | null
        }
        Insert: {
          completed_at?: string | null
          done_nodes?: never
          heartbeat_at?: string | null
          in_flight_nodes?: never
          liveness?: never
          parent_run_id?: string | null
          pending_nodes?: never
          recursion_depth?: number | null
          run_id?: string | null
          run_worker_id?: string | null
          seconds_since_heartbeat?: never
          started_at?: string | null
          status?: string | null
          workflow_id?: string | null
        }
        Update: {
          completed_at?: string | null
          done_nodes?: never
          heartbeat_at?: string | null
          in_flight_nodes?: never
          liveness?: never
          parent_run_id?: string | null
          pending_nodes?: never
          recursion_depth?: number | null
          run_id?: string | null
          run_worker_id?: string | null
          seconds_since_heartbeat?: never
          started_at?: string | null
          status?: string | null
          workflow_id?: string | null
        }
        Relationships: []
      }
      v_workflow_run_timeline: {
        Row: {
          duration_ms: number | null
          error_message: string | null
          node_completed_at: string | null
          node_id: string | null
          node_label: string | null
          node_started_at: string | null
          node_status: string | null
          rel_end_s: number | null
          rel_start_s: number | null
          retry_count: number | null
          run_id: string | null
          run_started_at: string | null
          run_status: string | null
          ttfb_ms: number | null
          workflow_id: string | null
        }
        Relationships: []
      }
      vw_ai_models_public: {
        Row: {
          capabilities: string[] | null
          context_window_tokens: number | null
          id: string | null
          input_modalities: string[] | null
          is_active: boolean | null
          key: string | null
          name: string | null
          output_modalities: string[] | null
          provider_key: string | null
          provider_name: string | null
          supports_json_schema: boolean | null
          supports_tools: boolean | null
          supports_vision: boolean | null
        }
        Relationships: []
      }
      vw_auth_lenser: {
        Row: {
          lenser_id: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_battle_funnel: {
        Row: {
          past_draft: number | null
          pct_past_draft: number | null
          pct_reached_closed: number | null
          pct_reached_published: number | null
          pct_reached_voting: number | null
          reached_closed: number | null
          reached_published: number | null
          reached_voting: number | null
          total: number | null
        }
        Relationships: []
      }
      vw_battle_health: {
        Row: {
          confidence_level: string | null
          contender_count: number | null
          created_at: string | null
          finalized_at: string | null
          hours_to_finalize: number | null
          id: string | null
          published_at: string | null
          slug: string | null
          status:
            | 'draft'
            | 'open'
            | 'executing'
            | 'voting'
            | 'scoring'
            | 'closed'
            | 'published'
            | 'archived'
            | null
          submission_count: number | null
          title: string | null
          total_vote_count: number | null
          voting_closes_at: string | null
          voting_opens_at: string | null
          winner_contender_id: string | null
        }
        Relationships: []
      }
      vw_battle_participation: {
        Row: {
          battles_completed: number | null
          battles_created: number | null
          total_votes: number | null
          unique_hosts: number | null
          unique_voters: number | null
          week: string | null
        }
        Relationships: []
      }
      vw_battles_public: {
        Row: {
          contender_count: number | null
          created_at: string | null
          creator_lenser_id: string | null
          id: string | null
          slug: string | null
          status:
            | 'draft'
            | 'open'
            | 'executing'
            | 'voting'
            | 'scoring'
            | 'closed'
            | 'published'
            | 'archived'
            | null
          title: string | null
          total_vote_count: number | null
          updated_at: string | null
        }
        Relationships: []
      }
      vw_content_tags_public: {
        Row: {
          id: string | null
          name: string | null
          slug: string | null
          visibility: 'public' | 'private' | 'hidden' | null
        }
        Relationships: []
      }
      vw_content_thread_replies_public: {
        Row: {
          author_profile: Json | null
          content: string | null
          content_html: string | null
          created_at: string | null
          id: string | null
          lenser_id: string | null
          parent_reply_id: string | null
          reaction_totals: Json | null
          thread_id: string | null
        }
        Relationships: []
      }
      vw_content_threads_public: {
        Row: {
          author_profile: Json | null
          content: string | null
          created_at: string | null
          id: string | null
          lens_data: Json | null
          lenser_handle: string | null
          lenser_id: string | null
          like_count: number | null
          reaction_totals: Json | null
          reply_count: number | null
          tags: Json | null
          thumbnail_url: string | null
          title: string | null
          view_count: number | null
          visibility: 'public' | 'community' | 'private' | null
        }
        Relationships: []
      }
      vw_feedback_admin: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string | null
          message: string | null
          page: string | null
          product_tag: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date: string | null
          status: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          message?: string | null
          page?: string | null
          product_tag?: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date?: string | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          message?: string | null
          page?: string | null
          product_tag?: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date?: string | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
          user_id?: string | null
        }
        Relationships: []
      }
      vw_feedback_user: {
        Row: {
          created_at: string | null
          end_date: string | null
          message: string | null
          page: string | null
          product_tag: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date: string | null
          status: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          message?: string | null
          page?: string | null
          product_tag?: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date?: string | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          message?: string | null
          page?: string | null
          product_tag?: 'bug' | 'feature' | 'ui_ux' | 'general' | 'other' | null
          start_date?: string | null
          status?: 'pending' | 'in_progress' | 'resolved' | 'closed' | null
        }
        Relationships: []
      }
      vw_global_messages: {
        Row: {
          battle_id: string | null
          body: string | null
          created_at: string | null
          id: string | null
          sender_handle: string | null
          sender_id: string | null
          sender_role: string | null
        }
        Insert: {
          battle_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          sender_handle?: string | null
          sender_id?: string | null
          sender_role?: string | null
        }
        Update: {
          battle_id?: string | null
          body?: string | null
          created_at?: string | null
          id?: string | null
          sender_handle?: string | null
          sender_id?: string | null
          sender_role?: string | null
        }
        Relationships: []
      }
      vw_lensers_public_recent: {
        Row: {
          app_id: string | null
          avatar_url: string | null
          created_at: string | null
          current_level: number | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          handle: string | null
          headline: string | null
          join_order: number | null
          joined_at: string | null
          lens_count: number | null
          lenser_id: string | null
          max_xp: number | null
          min_xp: number | null
          status: 'active' | 'suspended' | 'deactivated' | 'pending_deletion' | 'deleted' | null
          thread_count: number | null
          total_xp: number | null
        }
        Relationships: []
      }
      vw_lensers_social_links_private: {
        Row: {
          created_at: string | null
          handle: string | null
          id: string | null
          label: string | null
          platform:
            | 'Behance'
            | 'Dribbble'
            | 'GitHub'
            | 'Instagram'
            | 'LinkedIn'
            | 'Twitch'
            | 'Website'
            | 'X'
            | 'Twitter'
            | 'Youtube'
            | 'Facebook'
            | null
          url: string | null
        }
        Relationships: []
      }
      vw_lensers_social_links_public: {
        Row: {
          handle: string | null
          label: string | null
          platform:
            | 'Behance'
            | 'Dribbble'
            | 'GitHub'
            | 'Instagram'
            | 'LinkedIn'
            | 'Twitch'
            | 'Website'
            | 'X'
            | 'Twitter'
            | 'Youtube'
            | 'Facebook'
            | null
          url: string | null
        }
        Relationships: []
      }
      vw_lenses_public: {
        Row: {
          author_profile: Json | null
          content: string | null
          copy_count: number | null
          created_at: string | null
          description: string | null
          id: string | null
          lenser_handle: string | null
          lenser_id: string | null
          like_count: number | null
          reaction_totals: Json | null
          saved_count: number | null
          tags: Json | null
          title: string | null
          visibility: 'public' | 'community' | 'private' | null
        }
        Relationships: []
      }
      vw_tags_public_extended: {
        Row: {
          created_at: string | null
          created_count: number | null
          id: string | null
          name: string | null
          reacted_count: number | null
          slug: string | null
          total_usage: number | null
          trend_score: number | null
          viewed_count: number | null
          visibility: string | null
        }
        Relationships: []
      }
      vw_tags_public_stats: {
        Row: {
          created_at: string | null
          created_count: number | null
          id: string | null
          name: string | null
          reacted_count: number | null
          slug: string | null
          total_usage: number | null
          trend_score_7d: number | null
          viewed_count: number | null
          visibility: string | null
        }
        Relationships: []
      }
      vw_workflows: {
        Row: {
          battle_count: number | null
          created_at: string | null
          description: string | null
          fork_count: number | null
          id: string | null
          lenser_id: string | null
          node_count: number | null
          parent_workflow_id: string | null
          reaction_totals: Json | null
          title: string | null
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          battle_count?: number | null
          created_at?: string | null
          description?: string | null
          fork_count?: number | null
          id?: string | null
          lenser_id?: string | null
          node_count?: never
          parent_workflow_id?: string | null
          reaction_totals?: Json | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          battle_count?: number | null
          created_at?: string | null
          description?: string | null
          fork_count?: number | null
          id?: string | null
          lenser_id?: string | null
          node_count?: never
          parent_workflow_id?: string | null
          reaction_totals?: Json | null
          title?: string | null
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      vw_xp_leaderboard_global: {
        Row: {
          current_level: number | null
          lenser_id: string | null
          rank: number | null
          total_xp: number | null
          user: Json | null
        }
        Relationships: []
      }
      vw_xp_leaderboard_season: {
        Row: {
          app_id: string | null
          lenser_id: string | null
          rank: number | null
          season_id: string | null
          season_slug: string | null
          total_xp: number | null
          user: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_credit_cost: {
        Args: {
          p_input_tokens?: number
          p_model_id: string
          p_output_tokens?: number
          p_units?: number
        }
        Returns: number
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      fn__workspace_ownership_predicate: {
        Args: { p_table_name: string }
        Returns: string
      }
      fn_accept_follow_request: {
        Args: { p_source_profile_id: string }
        Returns: Json
      }
      fn_admin_get_dlq_entries: {
        Args: { p_unresolved_only?: boolean }
        Returns: {
          attempt_count: number
          battle_id: string
          contender_id: string
          created_at: string
          error_code: string
          error_message: string
          id: string
          job_id: string
          payload: Json
          resolved_at: string
          slot: string
        }[]
      }
      fn_admin_get_stuck_battles: {
        Args: { p_threshold_minutes?: number }
        Returns: {
          id: string
          slug: string
          stale_seconds: number
          status: string
          title: string
          updated_at: string
        }[]
      }
      fn_admin_get_vote_anomalies: {
        Args: { p_battle_id?: string; p_limit?: number; p_status?: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'vote_anomalies'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_admin_get_worker_health: {
        Args: never
        Returns: {
          is_healthy: boolean
          last_seen_at: string
          seconds_since: number
          worker_id: string
          worker_type: string
        }[]
      }
      fn_admin_health: { Args: never; Returns: Json }
      fn_admin_retry_dlq: {
        Args: { p_dead_letter_id: string }
        Returns: undefined
      }
      fn_advance_series: {
        Args: { p_series_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'series'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_advance_tournament: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      fn_agent_adapters_register: {
        Args: { p_adapter_type: string; p_config?: Json; p_name: string }
        Returns: string
      }
      fn_agent_adapters_remove: {
        Args: { p_adapter_id: string }
        Returns: undefined
      }
      fn_agent_daily_join_count: {
        Args: { p_agent_id: string }
        Returns: number
      }
      fn_agent_list_subscriptions: {
        Args: { p_agent_id: string }
        Returns: {
          active: boolean
          category: string
          created_at: string
          daily_count: number
          execution_mode: string
          id: string
          max_joins_per_day: number
          require_owner_approval: boolean
          workflow_id: string
        }[]
      }
      fn_agent_run_events: {
        Args: {
          p_ai_lenser_id: string
          p_event_type?: string
          p_limit?: number
          p_run_id?: string
        }
        Returns: {
          agent_run_step_id: string
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          team_run_id: string
        }[]
      }
      fn_agent_subscribe_to_battles: {
        Args: {
          p_agent_id: string
          p_category?: string
          p_execution_mode?: string
          p_max_joins_per_day?: number
          p_require_approval?: boolean
          p_workflow_id?: string
        }
        Returns: string
      }
      fn_agent_unsubscribe_from_battles: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      fn_ai_catalog_model_detail: {
        Args: { p_model_key: string; p_provider_key: string }
        Returns: {
          capabilities: string[]
          context_window_tokens: number
          cost_per_unit: number
          description: string
          developer_summary: string
          docs_url: string
          id: string
          input_cost_per_1k_tokens: number
          input_modalities: string[]
          is_active: boolean
          key: string
          metadata: Json
          name: string
          output_cost_per_1k_tokens: number
          output_modalities: string[]
          provider_id: string
          provider_key: string
          provider_name: string
          status: string
          support_level: string
          supports_json_schema: boolean
          supports_streaming: boolean
          supports_tools: boolean
          supports_vision: boolean
          unit_type: string
          use_cases: string[]
          user_summary: string
        }[]
      }
      fn_ai_catalog_models: {
        Args: {
          p_capability?: string
          p_modality?: string
          p_provider_key?: string
          p_support_level?: string
        }
        Returns: {
          capabilities: string[]
          context_window_tokens: number
          cost_per_unit: number
          description: string
          developer_summary: string
          docs_url: string
          id: string
          input_cost_per_1k_tokens: number
          input_modalities: string[]
          is_active: boolean
          key: string
          metadata: Json
          name: string
          output_cost_per_1k_tokens: number
          output_modalities: string[]
          provider_id: string
          provider_key: string
          provider_name: string
          status: string
          support_level: string
          supports_json_schema: boolean
          supports_streaming: boolean
          supports_tools: boolean
          supports_vision: boolean
          unit_type: string
          use_cases: string[]
          user_summary: string
        }[]
      }
      fn_ai_catalog_providers: {
        Args: never
        Returns: {
          base_url: string
          display_name: string
          docs_url: string
          id: string
          is_active: boolean
          key: string
          logo_slug: string
          metadata: Json
          support_level: string
        }[]
      }
      fn_ai_get_generations_for_lens: {
        Args: {
          p_ai_model_slug?: string
          p_lens_id: string
          p_lenser_id: string
          p_limit?: number
          p_media_kind?: string
          p_offset?: number
        }
        Returns: {
          ai_model_slug: string
          created_at: string
          id: string
          input_params: Json
          input_text: string
          lens_id: string
          media: Json
          original_chat_url: string
          output_type: string
          visibility: 'public' | 'community' | 'private'
        }[]
      }
      fn_analytics_product_feedback_list_user_paginated: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          end_date: string
          message: string
          page: string
          product_tag: string
          start_date: string
          status: string
          total_count: number
        }[]
      }
      fn_analytics_share_events_log: {
        Args: {
          p_city?: string
          p_country?: string
          p_event_type?: string
          p_ip_hash?: string
          p_referer?: string
          p_short_id: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      fn_analytics_shared_links_consume: {
        Args: { p_short_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'shared_links'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_analytics_shared_links_create: {
        Args: {
          p_channel?: string
          p_display_name?: string
          p_expires_at?: string
          p_max_uses?: number
          p_meta?: Json
          p_resource_id?: string
          p_resource_type: string
          p_slug?: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'shared_links'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_analytics_shared_links_get: {
        Args: { p_short_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'shared_links'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_analytics_submit_feedback: {
        Args: {
          p_end_date?: string
          p_message?: string
          p_page?: string
          p_product_tag?: string
          p_start_date?: string
        }
        Returns: undefined
      }
      fn_analytics_submit_feedback_public: {
        Args: {
          p_end_date?: string
          p_message?: string
          p_page?: string
          p_product_tag?: string
          p_start_date?: string
        }
        Returns: undefined
      }
      fn_append_team_run_event: {
        Args: { p_event_type: string; p_payload: Json; p_team_run_id: string }
        Returns: undefined
      }
      fn_append_workflow_run_event: {
        Args: { p_payload?: Json; p_run_id: string; p_type: string }
        Returns: {
          created_at: string
          event_id: number
        }[]
      }
      fn_append_workflow_run_media: {
        Args: {
          p_media_type: string
          p_mime_type: string
          p_node_id?: string
          p_object_id: string
          p_run_id: string
        }
        Returns: undefined
      }
      fn_approve_tool_invocation: {
        Args: { p_invocation_id: string }
        Returns: undefined
      }
      fn_archive_agent: { Args: { p_ai_lenser_id: string }; Returns: Json }
      fn_archive_lens: { Args: { p_lens_id: string }; Returns: Json }
      fn_archive_workflow: { Args: { p_workflow_id: string }; Returns: Json }
      fn_artifact_archive: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: Json
      }
      fn_artifact_can_manage: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: boolean
      }
      fn_artifact_can_view: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: boolean
      }
      fn_artifact_delete: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: Json
      }
      fn_artifact_dependency_summary: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: Json
      }
      fn_artifact_lifecycle_status: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: Json
      }
      fn_artifact_pin: {
        Args: {
          p_artifact_id: string
          p_artifact_type: string
          p_pin?: boolean
        }
        Returns: Json
      }
      fn_artifact_restore: {
        Args: { p_artifact_id: string; p_artifact_type: string }
        Returns: Json
      }
      fn_assert_modality_allowed: {
        Args: { p_agent_id: string; p_modality: string }
        Returns: undefined
      }
      fn_assign_lens_to_contender: {
        Args: {
          p_battle_id: string
          p_contender_id: string
          p_input_snapshot?: Json
          p_lens_id: string
          p_version_id?: string
        }
        Returns: {
          assigned_at: string
          battle_id: string
          contender_id: string
          id: string
          input_snapshot: Json
          lens_id: string
          version_id: string
        }[]
      }
      fn_assign_tool: {
        Args: {
          p_ai_lenser_id: string
          p_allowed?: boolean
          p_profile_id?: string
          p_tool_id: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'tool_assignments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_auth_approve_device_request: {
        Args: { p_user_code: string }
        Returns: Json
      }
      fn_auth_exchange_device_approval: {
        Args: { p_request_id: string; p_request_secret: string }
        Returns: Json
      }
      fn_auth_exchange_device_login: {
        Args: { p_request_id: string; p_request_secret: string }
        Returns: Json
      }
      fn_auth_list_developer_tokens: {
        Args: never
        Returns: {
          createdAt: string
          expiresAt: string
          id: string
          label: string
          lastUsedAt: string
          revokedAt: string
          status: string
          tokenPrefix: string
        }[]
      }
      fn_auth_request_device_approval: {
        Args: {
          p_label?: string
          p_request_ttl_minutes?: number
          p_token_ttl_hours?: number
        }
        Returns: Json
      }
      fn_auth_request_device_login: {
        Args: { p_request_ttl_minutes?: number }
        Returns: Json
      }
      fn_auth_revoke_developer_token: {
        Args: { p_token_id: string }
        Returns: undefined
      }
      fn_auth_store_device_login_session: {
        Args: {
          p_access_token: string
          p_refresh_token: string
          p_user_code: string
        }
        Returns: Json
      }
      fn_backfill_schedule: {
        Args: { p_dry_run?: boolean; p_schedule_id: string; p_since: string }
        Returns: Json
      }
      fn_badge_check_and_award: {
        Args: { p_lenser_id: string }
        Returns: undefined
      }
      fn_battle_close_voting: {
        Args: { p_battle_id: string }
        Returns: undefined
      }
      fn_battle_dispatch_agent: {
        Args: {
          p_agent_id: string
          p_battle_id: string
          p_device_id?: string
          p_model_spec: string
          p_workflow_id?: string
        }
        Returns: Json
      }
      fn_battle_force_transition: {
        Args: { p_battle_id: string; p_reason: string; p_target_status: string }
        Returns: undefined
      }
      fn_battle_invite_accept: {
        Args: { p_token: string; p_via_qr?: boolean }
        Returns: Json
      }
      fn_battle_invite_create: {
        Args: { p_battle_id: string; p_target_handle?: string; p_type?: string }
        Returns: Json
      }
      fn_battle_invite_list: {
        Args: { p_battle_id: string; p_limit?: number }
        Returns: Json
      }
      fn_battle_invite_stats: { Args: { p_battle_id: string }; Returns: Json }
      fn_battle_open_voting: {
        Args: { p_battle_id: string }
        Returns: undefined
      }
      fn_battle_set_schedule: {
        Args: {
          p_auto_judge?: boolean
          p_auto_publish?: boolean
          p_battle_id: string
          p_judge_at?: string
          p_open_at?: string
          p_publish_at?: string
        }
        Returns: string
      }
      fn_battle_submit_workflow: {
        Args: {
          p_agent_id?: string
          p_battle_id: string
          p_content?: string
          p_run_id?: string
          p_workflow_id: string
        }
        Returns: string
      }
      fn_battle_update_workflow_submission: {
        Args: {
          p_content: string
          p_execution_run_id?: string
          p_submission_id: string
        }
        Returns: undefined
      }
      fn_battles_archive: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_auto_promote: {
        Args: { p_battle_id: string }
        Returns: boolean
      }
      fn_battles_auto_schedule_contenders: {
        Args: { p_battle_id: string }
        Returns: number
      }
      fn_battles_change_vote: {
        Args: { p_battle_id: string; p_new_contender_id: string }
        Returns: Json
      }
      fn_battles_check_readiness: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      fn_battles_clone: {
        Args: { p_battle_id: string; p_slug: string; p_title: string }
        Returns: string
      }
      fn_battles_close: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_create: {
        Args: {
          p_rubric_id?: string
          p_slug: string
          p_task_prompt: string
          p_title: string
        }
        Returns: string
      }
      fn_battles_create_from_template: {
        Args: { p_slug: string; p_template_id: string; p_title: string }
        Returns: string
      }
      fn_battles_create_rematch: {
        Args: { p_parent_id: string }
        Returns: string
      }
      fn_battles_create_template: {
        Args: {
          p_category?: string
          p_description?: string
          p_is_public?: boolean
          p_max_contenders?: number
          p_task_prompt?: string
          p_title: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'templates'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_battles_delete: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_delete_template: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      fn_battles_finalize: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_get_my_vote: {
        Args: { p_battle_id: string }
        Returns: {
          contender_id: string
          is_draw: boolean
          updated_at: string
          vote_value: string
        }[]
      }
      fn_battles_get_public: { Args: { p_battle_id: string }; Returns: Json }
      fn_battles_get_subscriptions: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          created_at: string
          event_types: string[]
          id: string
          owner_id: string
          revoked_at: string
          webhook_url: string
        }[]
      }
      fn_battles_get_template: {
        Args: { p_template_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'templates'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_battles_invite: {
        Args: { p_battle_id: string; p_email: string }
        Returns: string
      }
      fn_battles_join:
        | { Args: { p_battle_id: string }; Returns: string }
        | {
            Args: {
              p_agent_id?: string
              p_battle_id: string
              p_device_id?: string
              p_runner_mode?: string
              p_workflow_id?: string
            }
            Returns: string
          }
      fn_battles_leaderboard: {
        Args: { p_battle_id: string }
        Returns: {
          contender_id: string
          display_name: string
          rank: number
          score: number
          vote_count: number
        }[]
      }
      fn_battles_link_forum_thread: {
        Args: { p_battle_id: string; p_forum_thread_id: string }
        Returns: undefined
      }
      fn_battles_list_public: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          contender_count: number
          created_at: string
          creator_display_name: string
          id: string
          slug: string
          status: string
          title: string
          total_vote_count: number
          voting_closes_at: string
          voting_opens_at: string
        }[]
      }
      fn_battles_next_recommendation: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      fn_battles_notify_webhooks: {
        Args: { p_battle_id: string; p_event_type: string; p_payload: Json }
        Returns: undefined
      }
      fn_battles_open: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_publish: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_render_prompt: {
        Args: { p_template_id: string; p_variables?: Json }
        Returns: string
      }
      fn_battles_restore: { Args: { p_battle_id: string }; Returns: Json }
      fn_battles_retract: { Args: { p_battle_id: string }; Returns: undefined }
      fn_battles_revoke_webhook: {
        Args: { p_subscription_id: string }
        Returns: undefined
      }
      fn_battles_series_create: {
        Args: { p_cron_expr: string; p_name: string; p_seed_battle_id: string }
        Returns: string
      }
      fn_battles_start_voting: {
        Args: { p_battle_id: string; p_voting_closes_at?: string }
        Returns: undefined
      }
      fn_battles_submit:
        | {
            Args: {
              p_battle_id: string
              p_content_media?: Json
              p_content_text?: string
              p_content_url?: string
            }
            Returns: string
          }
        | {
            Args: {
              p_adapter_id?: string
              p_artifact_id?: string
              p_battle_id: string
              p_content_media?: Json
              p_content_text?: string
              p_content_url?: string
              p_execution_run_id?: string
              p_model_id?: string
              p_source_type?: string
            }
            Returns: string
          }
      fn_battles_submit_media: {
        Args: {
          p_battle_id: string
          p_contender_id: string
          p_media_url: string
          p_mime_type: string
          p_output_modality: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'submissions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_battles_subscribe_webhook: {
        Args: {
          p_battle_id: string
          p_event_types: string[]
          p_webhook_url: string
        }
        Returns: string
      }
      fn_battles_update_template: {
        Args: {
          p_category?: string
          p_description?: string
          p_is_public?: boolean
          p_max_contenders?: number
          p_task_prompt?: string
          p_template_id: string
          p_title?: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'templates'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_battles_vote:
        | {
            Args: {
              p_battle_id: string
              p_rationale?: string
              p_vote: 'contender_a' | 'contender_b' | 'draw'
            }
            Returns: undefined
          }
        | {
            Args: {
              p_battle_id: string
              p_contender_id?: string
              p_rationale?: string
              p_vote: 'contender_a' | 'contender_b' | 'draw'
            }
            Returns: undefined
          }
      fn_block_profile: { Args: { p_target_profile_id: string }; Returns: Json }
      fn_browse_battles: {
        Args: {
          p_after_created?: string
          p_after_id?: string
          p_category?: string
          p_limit?: number
          p_q?: string
          p_status?: string
        }
        Returns: {
          category: string
          contender_count: number
          created_at: string
          id: string
          slug: string
          status: string
          template_title: string
          title: string
          vote_count: number
        }[]
      }
      fn_byok_key_hint: {
        Args: { p_agent_id: string }
        Returns: {
          is_valid: boolean
          key_hint: string
          label: string
          provider: string
        }[]
      }
      fn_byok_key_register: {
        Args: {
          p_agent_id: string
          p_expires_at?: string
          p_key_encrypted: string
          p_key_hint?: string
          p_label?: string
          p_provider: string
        }
        Returns: string
      }
      fn_byok_key_resolve: {
        Args: { p_agent_id: string; p_model_id?: string; p_provider: string }
        Returns: string
      }
      fn_byok_key_resolve_v2: {
        Args: {
          p_agent_id: string
          p_model_id: string
          p_provider: string
          p_reservation_id: string
        }
        Returns: string
      }
      fn_byok_key_revoke: {
        Args: { p_agent_id: string; p_provider: string }
        Returns: undefined
      }
      fn_byok_key_rotate: {
        Args: {
          p_agent_id: string
          p_new_encrypted: string
          p_new_hint: string
          p_provider: string
        }
        Returns: undefined
      }
      fn_byok_log_usage: {
        Args: {
          p_battle_id: string
          p_key_id: string
          p_model_id: string
          p_token_count: number
        }
        Returns: undefined
      }
      fn_byok_rotation_due: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'byok_keys'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_byok_send_rotation_notifications: { Args: never; Returns: number }
      fn_byok_validate_for_battle: {
        Args: { p_battle_id: string; p_contender_id: string }
        Returns: Json
      }
      fn_cancel_account_deletion_on_login: { Args: never; Returns: Json }
      fn_cancel_agent_run: {
        Args: { p_ai_lenser_id: string; p_team_run_id: string }
        Returns: undefined
      }
      fn_cancel_all_active_runs: {
        Args: { p_reason: string }
        Returns: {
          cancelled_job_count: number
          cancelled_run_count: number
        }[]
      }
      fn_cancel_run: { Args: { p_team_run_id: string }; Returns: undefined }
      fn_cancel_workflow_run_over_budget: {
        Args: { p_pending_credits?: number; p_run_id: string }
        Returns: boolean
      }
      fn_check_and_upsert_aggregate: {
        Args: {
          p_actor_id: string
          p_entity_id: string
          p_recipient_id: string
          p_type: string
          p_window: string
        }
        Returns: boolean
      }
      fn_check_handle: {
        Args: { p_handle: string }
        Returns: {
          class_hit: string
          is_available: boolean
          reason_codes: string[]
          risk_score: number
          verdict: string
        }[]
      }
      fn_check_media_quality: {
        Args: { p_submission_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'media_quality_results'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_check_vote_velocity: {
        Args: { p_voter_id: string }
        Returns: undefined
      }
      fn_check_voter_eligibility: {
        Args: { p_battle_id: string; p_lenser_id: string }
        Returns: boolean
      }
      fn_check_webhook_signing_secret: {
        Args: never
        Returns: {
          is_set: boolean
          length_bytes: number
          strict_mode: boolean
        }[]
      }
      fn_claim_stale_workflow_run: {
        Args: {
          p_max_claims?: number
          p_stale_after_ms?: number
          p_worker_id: string
        }
        Returns: {
          parent_run_id: string
          previous_status: string
          recursion_depth: number
          run_id: string
          workflow_id: string
        }[]
      }
      fn_clone_lens: {
        Args: { p_source_lens_id: string; p_version_id?: string }
        Returns: string
      }
      fn_clone_workflow: {
        Args: { p_source_workflow_id: string }
        Returns: {
          battle_count: number
          created_at: string
          description: string
          fork_count: number
          id: string
          lenser_id: string
          parent_workflow_id: string
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_complete_onboarding: {
        Args: { p_display_name: string; p_handle: string }
        Returns: undefined
      }
      fn_complete_scratchpad_run: {
        Args: {
          p_cost_credits?: number
          p_error?: string
          p_output: string
          p_run_id: string
          p_status?: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'scratchpad_runs'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_complete_tool_invocation: {
        Args: {
          p_cost?: number
          p_error?: string
          p_invocation_id: string
          p_output?: Json
          p_status: string
        }
        Returns: undefined
      }
      fn_compute_elo_after_battle: {
        Args: { p_battle_id: string }
        Returns: Json
      }
      fn_connector_assert_scope: {
        Args: { p_granted: string[]; p_required: string }
        Returns: Json
      }
      fn_connector_create: {
        Args: {
          p_description: string
          p_name: string
          p_scopes: string[]
          p_slug: string
        }
        Returns: Json
      }
      fn_connector_get: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          description: string
          is_active: boolean
          kind: string
          last_used_at: string
          name: string
          scopes: string[]
          slug: string
        }[]
      }
      fn_connector_remove: { Args: { p_slug: string }; Returns: undefined }
      fn_connector_rotate: { Args: { p_slug: string }; Returns: Json }
      fn_connector_test: { Args: { p_slug: string }; Returns: Json }
      fn_connectors_list: {
        Args: never
        Returns: {
          created_at: string
          description: string
          is_active: boolean
          kind: string
          last_used_at: string
          name: string
          scopes: string[]
          slug: string
        }[]
      }
      fn_content_create_thread: {
        Args: {
          p_content: string
          p_tag_ids?: string[]
          p_title: string
          p_visibility: 'public' | 'community' | 'private'
        }
        Returns: string
      }
      fn_content_follow_tag: { Args: { p_tag_id: string }; Returns: Json }
      fn_content_get_followed_tags: {
        Args: { p_lenser_id: string }
        Returns: {
          followed_at: string
          name: string
          slug: string
          tag_id: string
        }[]
      }
      fn_content_get_following_lenses: {
        Args: { p_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          created_at: string
          description: string
          id: string
          reaction_totals: Json
          tags: Json
          title: string
        }[]
      }
      fn_content_get_following_threads: {
        Args: { p_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          content: string
          created_at: string
          hot_score: number
          id: string
          primary_language: string
          reaction_totals: Json
          reply_count: number
          tags: Json
          title: string
        }[]
      }
      fn_content_get_lenses_by_tag: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_tag_slug: string
        }
        Returns: {
          author_profile: Json
          copy_count: number
          created_at: string
          description: string
          id: string
          lenser_id: string
          like_count: number
          reaction_totals: Json
          saved_count: number
          tags: Json
          title: string
          visibility: 'public' | 'community' | 'private'
        }[]
      }
      fn_content_get_personal_lenses: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          created_at: string
          description: string
          hot_score: number
          id: string
          personal_score: number
          primary_language: string
          reaction_totals: Json
          tags: Json
          title: string
        }[]
      }
      fn_content_get_personal_threads: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          content: string
          created_at: string
          hot_score: number
          id: string
          personal_score: number
          primary_language: string
          reaction_totals: Json
          reply_count: number
          tags: Json
          title: string
        }[]
      }
      fn_content_get_popular_lenses: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          copy_count: number
          created_at: string
          description: string
          id: string
          lenser_id: string
          like_count: number
          reaction_totals: Json
          saved_count: number
          tags: Json
          title: string
          visibility: 'public' | 'community' | 'private'
        }[]
      }
      fn_content_get_threads_by_tag: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_sort?: string
          p_tag_slug: string
        }
        Returns: {
          author_profile: Json
          content: string
          created_at: string
          id: string
          lenser_id: string
          like_count: number
          reaction_totals: Json
          reply_count: number
          tags: Json
          title: string
          view_count: number
          visibility: 'public' | 'community' | 'private'
        }[]
      }
      fn_content_get_trending_lenses: {
        Args: { p_lang?: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          created_at: string
          description: string
          hot_score: number
          id: string
          primary_language: string
          reaction_totals: Json
          tags: Json
          title: string
        }[]
      }
      fn_content_get_trending_threads: {
        Args: { p_lang?: string; p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          created_at: string
          hot_score: number
          id: string
          primary_language: string
          reaction_totals: Json
          reply_count: number
          tags: Json
          title: string
        }[]
      }
      fn_content_reactions_get_user_for_target: {
        Args: { p_target_id: string; p_target_type: string }
        Returns: {
          created_at: string
          id: string
          reaction: 'like' | 'dislike' | 'saved' | 'copy' | 'love' | 'clap'
          target_id: string
          user_id: string
        }[]
      }
      fn_content_reactions_toggle: {
        Args: {
          p_reaction: 'like' | 'dislike' | 'saved' | 'copy' | 'love' | 'clap'
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      fn_content_report: {
        Args: { p_reason?: string; p_target_id: string; p_target_type: string }
        Returns: Json
      }
      fn_content_tags_create: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      fn_content_tags_get_by_slug: {
        Args: { p_slug: string }
        Returns: {
          created_at: string
          id: string
          name: string
          slug: string
          visibility: 'public' | 'private' | 'hidden'
        }[]
      }
      fn_content_unfollow_tag: { Args: { p_tag_id: string }; Returns: Json }
      fn_core_languages_list: { Args: never; Returns: Json }
      fn_cost_commit: {
        Args: {
          p_actual_credits: number
          p_actual_usd: number
          p_reservation_id: string
        }
        Returns: {
          committed_credits: number
          committed_usd: number
          reservation_id: string
          status: string
        }[]
      }
      fn_cost_expire_reservations: {
        Args: { p_max_batch?: number }
        Returns: number
      }
      fn_cost_meter_tick: {
        Args: { p_reservation_id: string; p_running_credits: number }
        Returns: {
          over_limit: boolean
          reserved_credits: number
          running_credits: number
          status: string
        }[]
      }
      fn_cost_quote: {
        Args: {
          p_est_input_tokens?: number
          p_est_max_output_tokens?: number
          p_model_id: string
          p_units?: number
        }
        Returns: {
          credit_rate_usd: number
          estimated_credits: number
          estimated_usd: number
          pricing_snapshot_id: string
          taken_at: string
          unit_type: 'tokens' | 'image' | 'video_second' | 'audio_second'
        }[]
      }
      fn_cost_release: {
        Args: { p_reason: string; p_reservation_id: string }
        Returns: {
          reservation_id: string
          status: string
        }[]
      }
      fn_cost_reserve: {
        Args: {
          p_actor_id?: string
          p_ai_lenser_id: string
          p_context?: Json
          p_idempotency_key: string
          p_org_id?: string
          p_pricing_snapshot_id: string
          p_provider_key: string
          p_reserved_credits: number
          p_reserved_usd: number
          p_ttl?: string
        }
        Returns: {
          held_until: string
          reservation_id: string
          shadow_mode: boolean
          status: string
        }[]
      }
      fn_create_agent_team: {
        Args: {
          p_ai_lenser_id: string
          p_description?: string
          p_initial_members?: Json
          p_name: string
        }
        Returns: Json
      }
      fn_create_ai_lenser: {
        Args: {
          p_ai_model_id?: string
          p_display_name: string
          p_handle: string
          p_owner_lenser_id: string
        }
        Returns: Json
      }
      fn_create_automation_notification: {
        Args: {
          p_body: string
          p_lenser_id: string
          p_payload?: Json
          p_title: string
        }
        Returns: string
      }
      fn_create_battle: {
        Args: {
          p_battle_type: string
          p_handicap_config?: Json
          p_lens_id?: string
          p_task_prompt: string
          p_title: string
          p_voter_eligibility?: string
          p_workflow_id?: string
        }
        Returns: {
          auto_publish: boolean
          battle_type: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          forum_thread_id: string
          handicap_config: Json
          id: string
          lens_id: string
          og_image_url: string
          parent_battle_id: string
          published_at: string
          slug: string
          status: string
          task_prompt: string
          title: string
          total_vote_count: number
          vote_velocity: number
          voter_eligibility: string
          voting_closes_at: string
          voting_duration_hours: number
          voting_opens_at: string
          winner_contender_id: string
          workflow_id: string
        }[]
      }
      fn_create_battle_config_snapshot: {
        Args: { p_battle_id: string; p_reason?: string }
        Returns: string
      }
      fn_create_battle_series: {
        Args: { p_round_count?: number; p_template_id: string; p_title: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'series'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_evaluation_rubric: {
        Args: { p_criteria: Json; p_evaluation_id: string }
        Returns: Json
      }
      fn_create_evaluation_with_cases: {
        Args: {
          p_ai_lenser_id: string
          p_cases?: Json
          p_dataset_uri?: string
          p_description?: string
          p_name: string
          p_owner_lenser_id: string
          p_scoring_rules?: Json
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      fn_create_lens: {
        Args: {
          p_description?: string
          p_forked_from_execution_id?: string
          p_language_code?: string
          p_params?: Json
          p_parent_lens_id?: string
          p_tag_ids?: string[]
          p_template_body: string
          p_title: string
          p_visibility: string
        }
        Returns: string
      }
      fn_create_media_object: {
        Args: {
          p_content_text?: string
          p_external_url?: string
          p_media_type: string
          p_mime_type: string
          p_name: string
          p_workspace_id: string
        }
        Returns: {
          bucket: string
          byte_size: number
          content_text: string
          created_at: string
          external_url: string
          id: string
          lifecycle_state: string
          media_type: string
          metadata: Json
          mime_type: string
          name: string
          object_key: string
          owner_lenser_id: string
          updated_at: string
          visibility: string
          workspace_id: string
        }[]
      }
      fn_create_run_report: { Args: { p_team_run_id: string }; Returns: string }
      fn_create_schedule_calendar: {
        Args: {
          p_dates?: string[]
          p_kind: string
          p_name: string
          p_timezone?: string
        }
        Returns: string
      }
      fn_create_scratchpad_run: {
        Args: {
          p_ai_lenser_id: string
          p_metadata?: Json
          p_model_id?: string
          p_prompt: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'scratchpad_runs'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_tag: {
        Args: { p_language_code?: string; p_name: string; p_slug: string }
        Returns: {
          id: string
          name: string
          slug: string
          visibility: string
        }[]
      }
      fn_create_team_run: {
        Args: {
          p_ai_lenser_id: string
          p_approval_status?: string
          p_team_id?: string
          p_workflow_assignment_id?: string
          p_workflow_id?: string
          p_workflow_run_id?: string
        }
        Returns: Json
      }
      fn_create_thread_reply: {
        Args: {
          p_content: string
          p_parent_reply_id?: string
          p_thread_id: string
        }
        Returns: {
          id: string
          lenser_id: string
        }[]
      }
      fn_create_tournament: {
        Args: {
          p_ai_judge_enabled?: boolean
          p_battle_type?: string
          p_format?: string
          p_max_contenders?: number
          p_title: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'tournaments'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_create_workflow: {
        Args: { p_description?: string; p_title: string; p_visibility?: string }
        Returns: {
          battle_count: number
          created_at: string
          description: string
          id: string
          lenser_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_create_workflow_version: {
        Args: { p_changelog?: string; p_workflow_id: string }
        Returns: string
      }
      fn_create_workspace_record: {
        Args: { p_data: Json; p_table_name: string }
        Returns: Json
      }
      fn_deactivate_account: { Args: never; Returns: Json }
      fn_decide_approval: {
        Args: {
          p_decision: string
          p_modifications?: Json
          p_reason?: string
          p_team_run_id: string
        }
        Returns: {
          ai_lenser_id: string
          approval_status: string
          decided_at: string
          metadata: Json
          request_id: string
          run_status: string
          team_id: string
          workflow_assignment_id: string
          workflow_id: string
          workflow_run_id: string
        }[]
      }
      fn_decide_moderation_override: {
        Args: {
          p_battle_id: string
          p_decision: string
          p_entry_id: string
          p_reason: string
        }
        Returns: undefined
      }
      fn_decide_tool_invocation: {
        Args: { p_decision: string; p_log_id: string; p_reason?: string }
        Returns: undefined
      }
      fn_decrypt_integration_credential: {
        Args: { p_credential_id: string }
        Returns: Json
      }
      fn_delete_agent: { Args: { p_ai_lenser_id: string }; Returns: Json }
      fn_delete_automation_rule: {
        Args: { p_rule_id: string }
        Returns: undefined
      }
      fn_delete_lens: { Args: { p_lens_id: string }; Returns: undefined }
      fn_delete_media_object: {
        Args: { p_object_id: string }
        Returns: undefined
      }
      fn_delete_thread: { Args: { p_thread_id: string }; Returns: undefined }
      fn_delete_thread_reply: {
        Args: { p_reply_id: string }
        Returns: undefined
      }
      fn_delete_workflow: { Args: { p_workflow_id: string }; Returns: Json }
      fn_delete_workflow_edge: {
        Args: { p_edge_id: string }
        Returns: undefined
      }
      fn_delete_workflow_node: {
        Args: { p_node_id: string }
        Returns: undefined
      }
      fn_delete_workflow_phase: {
        Args: { p_phase_id: string }
        Returns: undefined
      }
      fn_delete_workflow_schedule: {
        Args: { p_schedule_id: string }
        Returns: undefined
      }
      fn_delete_workflow_task: {
        Args: { p_task_id: string }
        Returns: undefined
      }
      fn_delete_workspace_item: {
        Args: { p_id: string; p_table_name: string }
        Returns: undefined
      }
      fn_detect_suspicious_voting: {
        Args: { p_battle_id: string }
        Returns: Json[]
      }
      fn_device_approve: { Args: { p_device_id: string }; Returns: undefined }
      fn_device_heartbeat: {
        Args: {
          p_daemon_version?: string
          p_device_id: string
          p_envelope_sig?: string
          p_gateway_status?: string
        }
        Returns: undefined
      }
      fn_device_list: {
        Args: { p_cursor?: string; p_limit?: number; p_trust_level?: string }
        Returns: {
          arch: string
          capabilities: Json
          cli_version: string
          created_at: string
          device_type: string
          gateway_status: string
          id: string
          last_seen_at: string
          name: string
          os: string
          runner_version: string
          trust_level: string
        }[]
      }
      fn_device_post_challenge: {
        Args: {
          p_device_id: string
          p_signature: string
          p_signed_iat?: string
        }
        Returns: string
      }
      fn_device_register: {
        Args: {
          p_arch?: string
          p_capabilities?: Json
          p_cli_version?: string
          p_device_type?: string
          p_name: string
          p_os?: string
        }
        Returns: string
      }
      fn_device_register_with_key: {
        Args: {
          p_arch?: string
          p_capabilities?: Json
          p_cli_version?: string
          p_daemon_version?: string
          p_device_type?: string
          p_name: string
          p_os?: string
          p_public_key: string
        }
        Returns: {
          challenge_expires_at: string
          challenge_id: string
          challenge_nonce: string
          device_id: string
        }[]
      }
      fn_device_revoke: { Args: { p_device_id: string }; Returns: undefined }
      fn_dispatch_scheduled_workflows_with_approval: {
        Args: never
        Returns: number
      }
      fn_emergency_stop: {
        Args: { p_force_mode?: boolean; p_reason: string }
        Returns: {
          cancelled_jobs: number
          cancelled_runs: number
          switch_id: string
        }[]
      }
      fn_evaluate_pre_run_policy: {
        Args: {
          p_ai_lenser_id: string
          p_context?: Json
          p_workflow_id: string
        }
        Returns: {
          reason: string
          verdict: string
        }[]
      }
      fn_execution_persist_response: {
        Args: {
          p_credit_cost?: number
          p_lenser_id: string
          p_model: string
          p_provider: string
          p_response_meta?: Json
          p_response_text?: string
          p_status?: string
          p_token_input?: number
          p_token_output?: number
        }
        Returns: string
      }
      fn_expire_byok_keys: { Args: never; Returns: number }
      fn_expire_media_objects: { Args: never; Returns: number }
      fn_expire_stale_approvals: { Args: never; Returns: number }
      fn_export_workspace: { Args: { p_ai_lenser_id: string }; Returns: Json }
      fn_flag_vote_anomaly: {
        Args: {
          p_battle_id: string
          p_score: number
          p_type: string
          p_voter_id: string
        }
        Returns: undefined
      }
      fn_gateway_ack_commands: {
        Args: { p_command_ids: string[] }
        Returns: number
      }
      fn_gateway_approve_device: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      fn_gateway_claim_commands: {
        Args: { p_device_id: string; p_limit?: number }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'gateway_commands'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_gateway_claim_commands_v2: {
        Args: { p_device_id: string; p_limit?: number }
        Returns: {
          acked_at: string
          claimed_at: string
          command_type: string
          created_at: string
          device_id: string
          envelope_nonce: string
          envelope_sig: string
          id: string
          payload: Json
        }[]
      }
      fn_gateway_heartbeat: {
        Args: {
          p_daemon_version?: string
          p_device_id: string
          p_hostname?: string
          p_public_key: string
        }
        Returns: Json
      }
      fn_gateway_revoke_device: {
        Args: { p_device_id: string }
        Returns: undefined
      }
      fn_get_active_season: {
        Args: { p_app_id?: string }
        Returns: {
          ends_at: string
          id: string
          is_active: boolean
          name: string
          slug: string
          starts_at: string
        }[]
      }
      fn_get_agent_analytics_summary: {
        Args: {
          p_ai_lenser_id: string
          p_days?: number
          p_model_key?: string
          p_workflow_id?: string
        }
        Returns: Json
      }
      fn_get_agent_automation_feed: {
        Args: { p_ai_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          action_type: string
          event_type: string
          id: string
          kind: string
          occurred_at: string
          payload: Json
          result: string
          run_id: string
          schedule_id: string
          title: string
          workflow_id: string
          workflow_title: string
        }[]
      }
      fn_get_agent_cost_summary: {
        Args: { p_ai_lenser_id: string }
        Returns: {
          battles_used: number
          credits_spent: number
          period_date: string
          spending_limit: number
          votes_used: number
        }[]
      }
      fn_get_agent_profile: { Args: { p_ai_lenser_id: string }; Returns: Json }
      fn_get_agent_profile_by_profile_id: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      fn_get_agent_quota_snapshot: {
        Args: { p_ai_lenser_id: string; p_period_date?: string }
        Returns: {
          ai_lenser_id: string
          battles_used: number
          credits_spent: number
          id: string
          period_date: string
          updated_at: string
          votes_used: number
        }[]
      }
      fn_get_agent_workspace_bootstrap: {
        Args: { p_profile_handle: string }
        Returns: Json
      }
      fn_get_ai_handicap_policy: {
        Args: { p_battle_id: string }
        Returns: {
          allowed_model_tier: string
          battle_id: string
          id: string
          injected_delay_ms: number
          max_context_tokens: number
          max_tokens_per_second: number
          time_budget_ms: number
        }[]
      }
      fn_get_ai_judge_verdicts: {
        Args: { p_battle_id: string }
        Returns: {
          contender_id: string
          created_at: string
          criterion_id: string
          id: string
          model_key: string
          rationale: string
          run_id: string
          score: number
        }[]
      }
      fn_get_ai_model: {
        Args: { p_model_id: string }
        Returns: {
          capabilities: string[]
          context_window_tokens: number
          created_at: string
          description: string
          id: string
          input_modalities: string[]
          is_active: boolean
          key: string
          max_tokens: number
          name: string
          output_modalities: string[]
          provider_id: string
          supports_tools: boolean
          supports_vision: boolean
          temperature: number
        }[]
      }
      fn_get_ai_provider: {
        Args: { p_provider_id: string }
        Returns: {
          display_name: string
          id: string
          key: string
        }[]
      }
      fn_get_approval_request: { Args: { p_request_id: string }; Returns: Json }
      fn_get_auth_profile_gate: {
        Args: never
        Returns: {
          deletion_deadline_at: string
          deletion_requested_at: string
          onboarding_step: string
          status: string
        }[]
      }
      fn_get_batch_entity_reactions: {
        Args: { p_entity_ids: string[]; p_entity_type: string }
        Returns: {
          created_at: string
          entity_id: string
          lenser_id: string
          reaction: string
        }[]
      }
      fn_get_battle: {
        Args: { p_battle_id?: string; p_slug?: string }
        Returns: {
          auto_publish: boolean
          battle_type: string
          challenge_type: string
          contender_structure: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          finalized_at: string
          forum_thread_id: string
          handicap_config: Json
          id: string
          judging_mode: string
          lens_id: string
          lenser_battle_policy: Json
          og_image_url: string
          parent_battle_id: string
          published_at: string
          shared_input_snapshot: Json
          slug: string
          status: string
          task_prompt: string
          task_source: string
          title: string
          total_vote_count: number
          vote_velocity: number
          voter_eligibility: string
          voting_closes_at: string
          voting_duration_hours: number
          voting_opens_at: string
          winner_contender_id: string
          workflow_id: string
        }[]
      }
      fn_get_battle_by_slug: {
        Args: { p_slug: string }
        Returns: {
          auto_publish: boolean
          battle_type: string
          challenge_type: string
          contender_structure: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          finalized_at: string
          forum_thread_id: string
          handicap_config: Json
          id: string
          judging_mode: string
          lens_id: string
          lenser_battle_policy: Json
          og_image_url: string
          parent_battle_id: string
          published_at: string
          shared_input_snapshot: Json
          slug: string
          status: string
          task_prompt: string
          task_source: string
          title: string
          total_vote_count: number
          vote_velocity: number
          voter_eligibility: string
          voting_closes_at: string
          voting_duration_hours: number
          voting_opens_at: string
          winner_contender_id: string
          workflow_id: string
        }[]
      }
      fn_get_battle_comments:
        | {
            Args: { p_battle_id: string; p_limit?: number }
            Returns: {
              battle_id: string
              body: string
              created_at: string
              id: string
              lenser_avatar_url: string
              lenser_display_name: string
              lenser_handle: string
              lenser_id: string
              updated_at: string
            }[]
          }
        | {
            Args: {
              p_battle_id: string
              p_before_id?: string
              p_before_ts?: string
              p_limit?: number
            }
            Returns: {
              battle_id: string
              body: string
              created_at: string
              id: string
              lenser_avatar_url: string
              lenser_display_name: string
              lenser_handle: string
              lenser_id: string
              updated_at: string
            }[]
          }
      fn_get_battle_contenders: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          contender_ref_id: string
          contender_status: string
          contender_type: string
          display_name: string
          entry_mode: string
          id: string
          joined_at: string
          slot: string
        }[]
      }
      fn_get_battle_elo_log: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          computed_at: string
          is_draw: boolean
          k_factor: number
          loser_lenser_id: string
          loser_score_after: number
          loser_score_before: number
          winner_lenser_id: string
          winner_score_after: number
          winner_score_before: number
        }[]
      }
      fn_get_battle_execution_config: {
        Args: { p_battle_id: string }
        Returns: Json[]
      }
      fn_get_battle_execution_jobs: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          claimed_at: string
          completed_at: string
          contender_id: string
          created_at: string
          error_message: string
          id: string
          max_retries: number
          retry_count: number
          slot: string
          status: string
          worker_id: string
        }[]
      }
      fn_get_battle_full: {
        Args: { p_slug: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'v_battle_full'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_get_battle_public_execution_jobs: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          claimed_at: string
          completed_at: string
          created_at: string
          id: string
          retry_count: number
          slot: string
          status: string
        }[]
      }
      fn_get_battle_results: { Args: { p_battle_slug: string }; Returns: Json }
      fn_get_battle_scorecards: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          contender_id: string
          explanation: string
          id: string
          result: string
          rubric_criterion_id: string
        }[]
      }
      fn_get_battle_share_card: {
        Args: { p_slug: string }
        Returns: {
          battle_id: string
          contender_a_id: string
          contender_a_name: string
          contender_b_id: string
          contender_b_name: string
          deleted_at: string
          elo_is_draw: boolean
          elo_loser_after: number
          elo_loser_before: number
          elo_winner_after: number
          elo_winner_before: number
          finalized_at: string
          slug: string
          status: string
          title: string
          total_vote_count: number
          winner_contender_id: string
        }[]
      }
      fn_get_battle_submissions: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          contender_id: string
          content_text: string
          content_url: string
          execution_run_id: string
          id: string
          is_final: boolean
          media_url: string
          mime_type: string
          output_modality: string
          status: string
          submitted_at: string
        }[]
      }
      fn_get_battles_feed: {
        Args: {
          p_battle_type?: string
          p_cursor?: string
          p_limit?: number
          p_status?: string
        }
        Returns: {
          battle_type: string
          contender_a_id: string
          contender_a_name: string
          contender_a_type: string
          contender_b_id: string
          contender_b_name: string
          contender_b_type: string
          content_type: string
          id: string
          published_at: string
          slug: string
          status: string
          title: string
          total_vote_count: number
          voter_eligibility: string
          voting_closes_at: string
          voting_opens_at: string
          winner_slot: string
        }[]
      }
      fn_get_contender_rating: {
        Args: { p_category?: string; p_lenser_id: string }
        Returns: {
          battles_played: number
          category: string
          draws: number
          elo_rating: number
          id: string
          lenser_id: string
          losses: number
          uncertainty: number
          updated_at: string
          wins: number
        }[]
      }
      fn_get_contender_ratings: {
        Args: { p_lenser_id: string; p_limit?: number }
        Returns: Json[]
      }
      fn_get_creator_timeseries: {
        Args: { p_days?: number; p_lenser_id: string }
        Returns: {
          battles: number
          day: string
          votes_received: number
          wins: number
          xp_earned: number
        }[]
      }
      fn_get_dlq_counts: { Args: never; Returns: Json }
      fn_get_dlq_entries: {
        Args: {
          p_battle_id?: string
          p_limit?: number
          p_unresolved_only?: boolean
        }
        Returns: {
          attempt_count: number
          battle_id: string
          contender_id: string
          created_at: string
          error_code: string
          error_message: string
          id: string
          job_id: string
          payload: Json
          resolved_at: string
          slot: string
        }[]
      }
      fn_get_entity_media_attachments: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          attached_at: string
          attachment_id: string
          binding_key: string
          bucket: string
          byte_size: number
          entity_id: string
          entity_type: string
          external_url: string
          lifecycle_state: string
          media_type: string
          metadata: Json
          mime_type: string
          name: string
          object_id: string
          object_key: string
          visibility: string
        }[]
      }
      fn_get_entity_reaction_counts: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: Json
      }
      fn_get_entity_reaction_status: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          reacted: boolean
          reaction: string
        }[]
      }
      fn_get_entity_reactions_by_lenser: {
        Args: {
          p_entity_id?: string
          p_entity_type: string
          p_lenser_id?: string
        }
        Returns: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          lenser_id: string
          reaction: string
        }[]
      }
      fn_get_entity_tag_ids: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          tag_id: string
        }[]
      }
      fn_get_entity_translation: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          content: string
          description: string
          title: string
        }[]
      }
      fn_get_evaluation_baseline: {
        Args: { p_evaluation_id: string }
        Returns: Json
      }
      fn_get_evaluation_results: { Args: { p_run_id: string }; Returns: Json[] }
      fn_get_execution_artifacts: {
        Args: { p_run_id: string }
        Returns: {
          artifact_kind: string
          content_json: Json
          content_text: string
          created_at: string
          id: string
          is_primary_output: boolean
          output_type: string
          run_id: string
          visibility: string
        }[]
      }
      fn_get_execution_status: { Args: never; Returns: Json }
      fn_get_fleet_overview: {
        Args: { p_human_lenser_id: string }
        Returns: Json
      }
      fn_get_follow_status: {
        Args: { p_target_profile_id: string }
        Returns: string
      }
      fn_get_gateway_device_health: {
        Args: never
        Returns: {
          approved_at: string
          created_at: string
          daemon_version: string
          device_id: string
          hostname: string
          kill_switch: boolean
          last_seen_at: string
          pending_commands: number
          revoked_at: string
          unacked_commands: number
        }[]
      }
      fn_get_global_lenserboard: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          lenser_id: string
          total_battles: number
          total_votes_received: number
          total_wins: number
          win_rate: number
        }[]
      }
      fn_get_global_messages: {
        Args: {
          p_battle_id: string
          p_before_id?: string
          p_before_ts?: string
          p_limit?: number
        }
        Returns: {
          battle_id: string
          body: string
          created_at: string
          id: string
          sender_handle: string
          sender_id: string
          sender_role: string
        }[]
      }
      fn_get_head_to_head: {
        Args: { p_lenser_a: string; p_lenser_b: string }
        Returns: {
          a_wins: number
          b_wins: number
          draws: number
          total_battles: number
        }[]
      }
      fn_get_human_activity_feed: {
        Args: { p_human_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          action_type: string
          ai_lenser_handle: string
          ai_lenser_id: string
          ai_lenser_name: string
          kind: string
          occurred_at: string
          payload: Json
          schedule_id: string
          status: string
          team_run_id: string
          title: string
          workflow_id: string
        }[]
      }
      fn_get_judge_calibration: {
        Args: { p_lenser_id: string }
        Returns: {
          agreement_rate: number
          calibration_score: number
          id: string
          kappa_score: number
          lenser_id: string
          total_judgments: number
          updated_at: string
        }[]
      }
      fn_get_latest_draft_battle_by_workflow: {
        Args: { p_workflow_id: string }
        Returns: Json
      }
      fn_get_leaderboard: {
        Args: { p_limit?: number; p_offset?: number; p_order_by?: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'v_leaderboard'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_get_lens_assignment: {
        Args: { p_contender_id: string }
        Returns: {
          assigned_at: string
          battle_id: string
          contender_id: string
          id: string
          input_snapshot: Json
          lens_id: string
          version_id: string
        }[]
      }
      fn_get_lens_detail_bootstrap: {
        Args: { p_lens_id: string }
        Returns: Json
      }
      fn_get_lens_execution_history: {
        Args: { p_lens_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          credit_cost: number
          funding_source: string
          latency_ms: number
          lens_id: string
          model_id: string
          model_key: string
          provider_key: string
          request_id: string
          run_id: string
          run_status: string
          token_input: number
          token_output: number
          version_id: string
          version_number: number
        }[]
      }
      fn_get_lens_for_execution: {
        Args: { p_lens_id: string }
        Returns: {
          head_version_id: string
          id: string
        }[]
      }
      fn_get_lens_fork_tree: { Args: { p_lens_id: string }; Returns: Json }
      fn_get_lens_version_detail: {
        Args: { p_version_id: string }
        Returns: {
          changelog: string
          created_at: string
          id: string
          lens_id: string
          parent_version_id: string
          published_at: string
          status: string
          template_body: string
          version_number: number
        }[]
      }
      fn_get_lens_version_parameters: {
        Args: { p_version_id: string }
        Returns: Json
      }
      fn_get_lenser_activity_timeline: {
        Args: { p_handle: string }
        Returns: {
          count: number
          date: string
        }[]
      }
      fn_get_lenser_badges: { Args: { p_lenser_id: string }; Returns: Json }
      fn_get_lenser_by_id_full: { Args: { p_lenser_id: string }; Returns: Json }
      fn_get_lenser_language_preference: { Args: never; Returns: string }
      fn_get_lenser_profile_brief: {
        Args: { p_handle?: string; p_lenser_id?: string }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
        }[]
      }
      fn_get_lenser_profile_full: {
        Args: { p_handle: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'v_lenser_profile_full'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_get_lenser_profiles_brief_batch: {
        Args: { p_lenser_ids: string[] }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
        }[]
      }
      fn_get_lenser_reaction_history: {
        Args: { p_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          entity_id: string
          entity_type: string
          lenser_id: string
          reaction: string
        }[]
      }
      fn_get_lenser_scores: {
        Args: { p_lenser_id: string }
        Returns: {
          computed_at: string
          id: string
          lenser_id: string
          score: number
          score_type: string
          uncertainty: number
        }[]
      }
      fn_get_lenser_threads_private: {
        Args: { p_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      fn_get_media_object: {
        Args: { p_object_id: string }
        Returns: {
          bucket: string
          byte_size: number
          content_text: string
          created_at: string
          external_url: string
          id: string
          lifecycle_state: string
          media_type: string
          metadata: Json
          mime_type: string
          name: string
          object_key: string
          owner_lenser_id: string
          updated_at: string
          visibility: string
          workspace_id: string
        }[]
      }
      fn_get_media_thumbnail_url: {
        Args: { p_media_id: string; p_width?: number }
        Returns: string
      }
      fn_get_memory_entries_by_workflow: {
        Args: { p_limit?: number; p_workflow_id: string }
        Returns: {
          ai_lenser_id: string
          confidence: number
          content: string
          created_at: string
          id: string
          is_redacted: boolean
          profile_id: string
          scope: string
          source: string
          team_run_id: string
        }[]
      }
      fn_get_model_test_runs: {
        Args: { p_battle_id?: string; p_limit?: number }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'model_test_runs'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_get_moderation_decisions_for_owner: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          ai_confidence: number
          appeal_outcome: string
          battle_id: string
          battle_slug: string
          battle_title: string
          decision_id: string
          decision_type: string
          is_ai_moderated: boolean
          is_appealed: boolean
          moderator_lenser_id: string
          occurred_at: string
          reason: string
          target_entity_id: string
          target_entity_schema: string
          target_entity_table: string
        }[]
      }
      fn_get_my_api_keys: {
        Args: never
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          key_suffix: string
          label: string
          lenser_id: string
          provider_id: string
          provider_key: string
          provider_name: string
          revoked_at: string
        }[]
      }
      fn_get_my_cost_reservations: {
        Args: { p_limit?: number; p_status?: string }
        Returns: {
          ai_lenser_id: string
          committed_credits: number
          created_at: string
          held_until: string
          id: string
          model_id: string
          provider_key: string
          reserved_credits: number
          status: string
        }[]
      }
      fn_get_my_key_secret: { Args: { p_key_id: string }; Returns: string }
      fn_get_my_lensers: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
          is_active: boolean
          type: string
        }[]
      }
      fn_get_my_lenses: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_profile: Json
          copy_count: number
          created_at: string
          description: string
          id: string
          lenser_id: string
          like_count: number
          reaction_totals: Json
          saved_count: number
          tags: Json
          title: string
          visibility: 'public' | 'community' | 'private'
        }[]
      }
      fn_get_my_vote: {
        Args: { p_battle_id: string }
        Returns: {
          vote_value: string
        }[]
      }
      fn_get_my_workflows: {
        Args: {
          p_lenser_id: string
          p_limit?: number
          p_offset?: number
          p_search?: string
          p_sort?: string
          p_visibility?: string
        }
        Returns: {
          battle_count: number
          created_at: string
          description: string
          fork_count: number
          id: string
          lenser_id: string
          node_count: number
          parent_workflow_id: string
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_get_notification_preferences: {
        Args: never
        Returns: {
          enabled: boolean
          notification_type: string
          updated_at: string
        }[]
      }
      fn_get_notifications: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          action_url: string
          body: string
          created_at: string
          id: string
          metadata: Json
          read_at: string
          title: string
          type: string
          unread_count: number
        }[]
      }
      fn_get_pending_requests: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
          requested_at: string
          source_profile_id: string
        }[]
      }
      fn_get_provider_configs: {
        Args: { p_ai_lenser_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'provider_configs'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_get_recently_active_lensers: {
        Args: { p_limit?: number }
        Returns: Json
      }
      fn_get_rubric_criteria: {
        Args: { p_criterion_ids: string[] }
        Returns: {
          description: string
          id: string
          title: string
          weight: number
        }[]
      }
      fn_get_rule_dispatch_summary: {
        Args: { p_days?: number }
        Returns: {
          dispatched_count: number
          failed_count: number
          last_attempted_at: string
          queued_count: number
          rule_id: string
          skipped_count: number
        }[]
      }
      fn_get_run_details: {
        Args: { p_run_id: string }
        Returns: {
          artifacts: Json
          billing_status: string
          completed_at: string
          credit_cost: number
          error_code: string
          error_message: string
          id: string
          latency_ms: number
          model_id: string
          model_key: string
          provider_key: string
          request_id: string
          started_at: string
          status: string
          token_input: number
          token_output: number
        }[]
      }
      fn_get_run_provenance: {
        Args: { p_run_id: string }
        Returns: {
          created_at: string
          direction: string
          id: string
          source_node_id: string
          source_output_path: string
          source_run_id: string
          source_workflow_id: string
          target_input_path: string
          target_node_id: string
          target_run_id: string
          target_workflow_id: string
          transform: Json
        }[]
      }
      fn_get_run_report: { Args: { p_report_id: string }; Returns: Json }
      fn_get_schedule_calendars: {
        Args: never
        Returns: {
          created_at: string
          dates: string[]
          id: string
          is_seed: boolean
          kind: string
          lenser_id: string
          name: string
          timezone: string
        }[]
      }
      fn_get_schedule_run_history: {
        Args: { p_cursor?: string; p_limit?: number; p_workflow_id: string }
        Returns: {
          completed_at: string
          created_at: string
          id: string
          schedule_id: string
          started_at: string
          status: string
          workflow_id: string
        }[]
      }
      fn_get_season_leaderboard: {
        Args: {
          p_app_id?: string
          p_limit?: number
          p_offset?: number
          p_season_id?: string
        }
        Returns: {
          app_id: string
          lenser_id: string
          rank: number
          season_id: string
          season_slug: string
          total_xp: number
          user: Json
        }[]
      }
      fn_get_series: {
        Args: { p_series_id: string }
        Returns: {
          battle_id: string
          battle_slug: string
          battle_status: string
          creator_lenser_id: string
          current_round: number
          round_count: number
          round_number: number
          series_id: string
          status: string
          template_id: string
          title: string
          winner_contender_id: string
        }[]
      }
      fn_get_team_members: { Args: { p_team_id: string }; Returns: Json[] }
      fn_get_thread_by_id_private: {
        Args: { p_thread_id: string }
        Returns: Json
      }
      fn_get_thread_replies_page: {
        Args: { p_limit?: number; p_offset?: number; p_thread_id: string }
        Returns: {
          author_profile: Json
          content: string
          content_html: string
          created_at: string
          id: string
          lenser_id: string
          parent_reply_id: string
          reaction_totals: Json
          thread_id: string
        }[]
      }
      fn_get_thread_replies_private: {
        Args: { p_limit?: number; p_offset?: number; p_thread_id: string }
        Returns: {
          content: string
          created_at: string
          deleted_at: string
          id: string
          lenser_id: string
          parent_reply_id: string
          thread_id: string
        }[]
      }
      fn_get_tool_invocation_rollup: {
        Args: { p_ai_lenser_id: string; p_days?: number }
        Returns: {
          approved_count: number
          last_invoked_at: string
          rejected_count: number
          tool_name: string
          total_invocations: number
          workflow_id: string
          workflow_title: string
        }[]
      }
      fn_get_tournament_bracket: {
        Args: { p_tournament_id: string }
        Returns: {
          battle_id: string
          battle_slug: string
          contender_a_avatar_url: string
          contender_a_handle: string
          contender_a_lenser_id: string
          contender_b_avatar_url: string
          contender_b_handle: string
          contender_b_lenser_id: string
          match_id: string
          round_number: number
          round_status: string
          winner_avatar_url: string
          winner_handle: string
          winner_lenser_id: string
        }[]
      }
      fn_get_tournament_by_slug: { Args: { p_slug: string }; Returns: Json }
      fn_get_tournament_contenders: {
        Args: { p_tournament_id: string }
        Returns: Json[]
      }
      fn_get_trending_battles: {
        Args: { p_cursor?: number; p_limit?: number }
        Returns: {
          battle_type: string
          contender_a_name: string
          contender_b_name: string
          id: string
          og_image_url: string
          published_at: string
          slug: string
          status: string
          title: string
          total_vote_count: number
          vote_velocity: number
          winner_slot: string
        }[]
      }
      fn_get_unread_notification_count: { Args: never; Returns: number }
      fn_get_user_entity_reaction: {
        Args: { p_entity_id: string; p_entity_type: string }
        Returns: {
          created_at: string
          entity_id: string
          reaction: string
        }[]
      }
      fn_get_version_contracts: {
        Args: { p_version_id: string }
        Returns: {
          input_contract: Json
          output_contract: Json
          version_id: string
        }[]
      }
      fn_get_vote_aggregates: {
        Args: { p_battle_id: string }
        Returns: {
          battle_id: string
          contender_id: string
          draw_count: number
          rank_position: number
          raw_vote_count: number
          weighted_vote_sum: number
        }[]
      }
      fn_get_workflow_bootstrap: {
        Args: { p_workflow_id: string }
        Returns: {
          edges: Json
          nodes: Json
          workflow: Json
        }[]
      }
      fn_get_workflow_detail: {
        Args: { p_workflow_id: string }
        Returns: {
          author_profile: Json
          battle_count: number
          created_at: string
          description: string
          fork_count: number
          id: string
          lenser_id: string
          parent_workflow_author_profile: Json
          parent_workflow_id: string
          parent_workflow_title: string
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_get_workflow_edges: {
        Args: { p_workflow_id: string }
        Returns: {
          id: string
          source_node_id: string
          source_output_key: string
          target_node_id: string
          target_param_label: string
          workflow_id: string
        }[]
      }
      fn_get_workflow_node_results: {
        Args: { p_run_id: string }
        Returns: {
          completed_at: string
          error_message: string
          execution_run_id: string
          id: string
          node_id: string
          output_data: Json
          run_id: string
          started_at: string
          status: string
        }[]
      }
      fn_get_workflow_nodes: {
        Args: { p_workflow_id: string }
        Returns: {
          config: Json
          created_at: string
          id: string
          label: string
          lens_id: string
          lens_lenser_id: string
          lens_visibility: string
          ordinal: number
          position_x: number
          position_y: number
          version_id: string
          workflow_id: string
        }[]
      }
      fn_get_workflow_run: {
        Args: { p_run_id: string }
        Returns: {
          completed_at: string
          context_inputs: Json
          created_at: string
          id: string
          started_at: string
          status: string
          triggered_by: string
          workflow_id: string
        }[]
      }
      fn_get_workflow_run_media_manifest: {
        Args: { p_run_id: string }
        Returns: {
          media_manifest: Json
        }[]
      }
      fn_get_workflow_run_state: {
        Args: { p_run_id: string }
        Returns: {
          active_node_id: string
          completed_at: string
          downstream_count: number
          executed_count: number
          failed_count: number
          in_flight_count: number
          is_running: boolean
          node_results: Json
          parent_run_id: string
          pending_count: number
          recursion_depth: number
          run_id: string
          started_at: string
          status: string
          upstream_count: number
          waiting_count: number
          workflow_id: string
        }[]
      }
      fn_get_workflow_schedule_history: {
        Args: { p_schedule_id: string }
        Returns: {
          completed_at: string
          created_at: string
          id: string
          scheduled_for: string
          started_at: string
          status: string
          workflow_id: string
        }[]
      }
      fn_get_workflow_schedules: {
        Args: { p_workflow_id?: string }
        Returns: {
          approval_policy: Json
          assignee_id: string
          assignee_type: string
          created_at: string
          cron_expr: string
          failure_policy: Json
          global_model_id: string
          id: string
          inputs_template: Json
          is_active: boolean
          last_completed_at: string
          last_dispatch_status: string
          last_error_at: string
          last_error_message: string
          last_result: Json
          last_run_at: string
          last_run_id: string
          next_run_at: string
          queue_policy: Json
          retry_policy: Json
          timezone: string
          workflow_assignment_id: string
          workflow_id: string
          workflow_title: string
        }[]
      }
      fn_get_workflow_versions: {
        Args: { p_workflow_id: string }
        Returns: {
          changelog: string
          created_at: string
          created_by: string
          edge_count: number
          id: string
          node_count: number
          published_at: string
          status: string
          version_number: number
          workflow_id: string
        }[]
      }
      fn_get_workspace_controls: {
        Args: { p_ai_lenser_id: string; p_limit?: number }
        Returns: {
          ai_lenser_id: string
          approval_status: string
          completed_at: string
          duration_seconds: number
          latest_evaluation_score: number
          memory_write_count: number
          run_id: string
          run_type: string
          started_at: string
          status: string
          step_count: number
          total_cost: number
        }[]
      }
      fn_get_workspace_settings: {
        Args: { p_ai_lenser_id: string }
        Returns: Json
      }
      fn_grant_standing_approval: {
        Args: {
          p_ai_lenser_id: string
          p_gate_kind?: string
          p_hours?: number
          p_workflow_id?: string
        }
        Returns: string
      }
      fn_health: { Args: never; Returns: number }
      fn_heartbeat_workflow_run: {
        Args: { p_run_id: string; p_worker_id: string }
        Returns: undefined
      }
      fn_human_fleet_logs: {
        Args: {
          p_event_type?: string
          p_human_lenser_id: string
          p_limit?: number
          p_offset?: number
          p_run_id?: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'v_human_fleet_logs'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_human_fleet_runs: {
        Args: {
          p_agent_id?: string
          p_human_lenser_id: string
          p_limit?: number
          p_offset?: number
          p_since?: string
          p_status?: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'v_human_fleet_runs'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_insert_notification: {
        Args: {
          p_action_url?: string
          p_actor_id?: string
          p_body?: string
          p_lenser_id: string
          p_metadata?: Json
          p_title: string
          p_type: string
        }
        Returns: string
      }
      fn_integrity_probe_elo_log: { Args: never; Returns: Json }
      fn_integrity_probe_moderation_override: {
        Args: { p_target_entity_id: string }
        Returns: Json
      }
      fn_integrity_probe_moderation_webhook: {
        Args: { p_target_url: string }
        Returns: Json
      }
      fn_invite_battle_contender: {
        Args: {
          p_battle_id: string
          p_contender_ref_id?: string
          p_contender_type: string
          p_display_name?: string
          p_handle?: string
          p_slot: string
        }
        Returns: {
          battle_id: string
          contender_ref_id: string
          contender_type: string
          display_name: string
          id: string
          slot: string
        }[]
      }
      fn_invoke_tool: {
        Args: {
          p_agent_run_step_id?: string
          p_ai_lenser_id: string
          p_input: Json
          p_team_run_id: string
          p_tool_id: string
        }
        Returns: string
      }
      fn_is_notification_blocked: {
        Args: { p_actor_id: string; p_recipient_id: string }
        Returns: boolean
      }
      fn_is_notification_muted: {
        Args: { p_lenser_id: string; p_type: string }
        Returns: boolean
      }
      fn_is_super_admin: { Args: never; Returns: boolean }
      fn_journey_state_get: { Args: never; Returns: Json }
      fn_journey_state_mark: {
        Args: { p_done?: boolean; p_step: string }
        Returns: undefined
      }
      fn_kill_switch_activate: {
        Args: {
          p_expires_at?: string
          p_reason?: string
          p_scope: string
          p_target_id?: string
        }
        Returns: string
      }
      fn_kill_switch_active: {
        Args: { p_scope: string; p_target_id?: string }
        Returns: boolean
      }
      fn_kill_switch_lift: { Args: { p_switch_id: string }; Returns: undefined }
      fn_kill_switch_list: {
        Args: never
        Returns: {
          activated_at: string
          expires_at: string
          id: string
          lifted_at: string
          operator_handle: string
          reason: string
          scope: string
          target_id: string
        }[]
      }
      fn_lens_star: {
        Args: { p_slug: string; p_unstar?: boolean }
        Returns: Json
      }
      fn_lensers_create_profile: {
        Args: { p_bio?: string; p_display_name: string; p_handle: string }
        Returns: Json
      }
      fn_lensers_follow: { Args: { p_following_id: string }; Returns: Json }
      fn_lensers_get_active_profile: {
        Args: never
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'profiles'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_lensers_get_current_id: { Args: never; Returns: string }
      fn_lensers_get_follows: {
        Args: {
          p_lenser_id: string
          p_limit?: number
          p_offset?: number
          p_type?: string
        }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          is_following: boolean
          lenser_id: string
        }[]
      }
      fn_lensers_get_fresh_profile: {
        Args: never
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          headline: string
          id: string
          updated_at: string
        }[]
      }
      fn_lensers_get_is_in_waitinglist: { Args: never; Returns: boolean }
      fn_lensers_get_leaderboard: {
        Args: { p_limit?: number; p_period?: string }
        Returns: {
          avatar_url: string
          current_level: number
          display_name: string
          handle: string
          lenser_id: string
          lenser_score: number
          rank: number
          total_xp: number
        }[]
      }
      fn_lensers_get_preferences: { Args: never; Returns: Json }
      fn_lensers_get_profile: { Args: { p_handle: string }; Returns: Json }
      fn_lensers_get_public_profile: {
        Args: { p_handle: string }
        Returns: Json
      }
      fn_lensers_get_suggested: {
        Args: { p_lenser_id: string; p_limit?: number }
        Returns: {
          avatar_url: string
          current_level: number
          display_name: string
          handle: string
          lenser_id: string
          lenser_score: number
          tag_overlap_score: number
          total_xp: number
        }[]
      }
      fn_lensers_get_trending: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          current_level: number
          display_name: string
          handle: string
          lenser_id: string
          lenser_score: number
          total_xp: number
        }[]
      }
      fn_lensers_is_following: {
        Args: { p_target_id: string }
        Returns: boolean
      }
      fn_lensers_list: {
        Args: { p_limit?: number; p_offset?: number; p_type?: string }
        Returns: {
          ai_model_id: string
          avatar_url: string
          bio: string
          created_at: string
          display_name: string
          engagement: Json
          handle: string
          id: string
          type: 'human' | 'ai'
        }[]
      }
      fn_lensers_request_deletion: { Args: never; Returns: undefined }
      fn_lensers_sync_social_links: {
        Args: { p_links: Json }
        Returns: undefined
      }
      fn_lensers_toggle_waitinglist: {
        Args: { p_kvkk_approved: boolean }
        Returns: undefined
      }
      fn_lensers_unfollow: { Args: { p_following_id: string }; Returns: Json }
      fn_lensers_update_preferences: { Args: { p_data: Json }; Returns: Json }
      fn_lensers_update_profile: { Args: { p_data: Json }; Returns: Json }
      fn_lenses_create_version: {
        Args: {
          p_changelog?: string
          p_lens_id: string
          p_parent_version_id?: string
          p_template_body: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'versions'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_lenses_list_versions: {
        Args: { p_lens_id: string }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'versions'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_lenses_publish_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      fn_lenses_starred: { Args: never; Returns: Json[] }
      fn_lifecycle_is_service_role: { Args: never; Returns: boolean }
      fn_list_agent_action_logs: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: {
          action_type: string
          ai_lenser_id: string
          context_ref_id: string
          context_ref_type: string
          id: string
          metadata: Json
          occurred_at: string
          result: string
        }[]
      }
      fn_list_agent_incidents: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_agent_lens_bindings: {
        Args: { p_ai_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          ai_lenser_id: string
          category_tags: string[]
          created_at: string
          id: string
          is_default: boolean
          lens_id: string
          version_id: string
        }[]
      }
      fn_list_agent_memories: {
        Args: {
          p_include_redacted?: boolean
          p_limit?: number
          p_profile_id: string
          p_scope?: string
        }
        Returns: Json[]
      }
      fn_list_agent_model_bindings: {
        Args: { p_ai_lenser_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          ai_lenser_id: string
          category_tags: string[]
          created_at: string
          id: string
          is_default: boolean
          model_id: string
        }[]
      }
      fn_list_agent_ownerships: {
        Args: { p_ai_lenser_id: string }
        Returns: {
          ai_lenser_id: string
          granted_at: string
          id: string
          owner_avatar_url: string
          owner_display_name: string
          owner_handle: string
          owner_lenser_id: string
          permission_scope: string[]
          revoked_at: string
          role: string
        }[]
      }
      fn_list_agent_run_steps: {
        Args: { p_team_run_id: string }
        Returns: Json[]
      }
      fn_list_agent_teams: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: {
          ai_lenser_id: string
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          status: string
          updated_at: string
        }[]
      }
      fn_list_agent_tools: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_agents_by_owner: {
        Args: { p_owner_lenser_id: string }
        Returns: Json[]
      }
      fn_list_approval_requests: {
        Args: {
          p_ai_lenser_id: string
          p_approval_status?: string
          p_limit?: number
        }
        Returns: Json[]
      }
      fn_list_automation_rules: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          action_config: Json
          action_kind: string
          created_at: string
          id: string
          is_active: boolean
          lenser_id: string
          match_event_type: string
          match_filter: Json
          name: string
          updated_at: string
        }[]
      }
      fn_list_battle_templates: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          created_at: string
          description: string
          id: string
          is_public: boolean
          max_contenders: number
          task_prompt: string
          title: string
          updated_at: string
        }[]
      }
      fn_list_evaluation_cases: {
        Args: { p_evaluation_id: string }
        Returns: Json[]
      }
      fn_list_evaluation_rubrics: {
        Args: { p_evaluation_id: string }
        Returns: Json[]
      }
      fn_list_evaluation_runs: {
        Args: { p_evaluation_id: string }
        Returns: Json[]
      }
      fn_list_evaluations: {
        Args: { p_cursor?: string; p_limit?: number; p_owner_lenser_id: string }
        Returns: Json[]
      }
      fn_list_gateway_devices: {
        Args: { p_limit?: number }
        Returns: {
          approved_at: string
          created_at: string
          daemon_version: string
          device_id: string
          hostname: string
          kill_switch: boolean
          last_seen_at: string
          revoked_at: string
        }[]
      }
      fn_list_lens_versions: {
        Args: { p_include_archived?: boolean; p_lens_id: string }
        Returns: {
          changelog: string
          created_at: string
          id: string
          lens_id: string
          parameter_count: number
          published_at: string
          status: string
          version_number: number
        }[]
      }
      fn_list_media_objects: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          bucket: string
          byte_size: number
          content_text: string
          created_at: string
          external_url: string
          id: string
          lifecycle_state: string
          media_type: string
          metadata: Json
          mime_type: string
          name: string
          object_key: string
          owner_lenser_id: string
          updated_at: string
          visibility: string
          workspace_id: string
        }[]
      }
      fn_list_memory_access_logs: {
        Args: { p_limit?: number; p_memory_id: string }
        Returns: Json[]
      }
      fn_list_memory_profiles: {
        Args: { p_ai_lenser_id: string }
        Returns: Json[]
      }
      fn_list_model_profiles: {
        Args: { p_ai_lenser_id: string }
        Returns: Json[]
      }
      fn_list_my_private_lenses: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          created_at: string
          forked_from_execution_id: string
          id: string
          lenser_id: string
          parent_lens_id: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_list_personality_profiles: {
        Args: { p_ai_lenser_id: string }
        Returns: Json[]
      }
      fn_list_policy_evaluations: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_public_battle_templates: {
        Args: { p_category?: string; p_limit?: number }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          is_public: boolean
          max_contenders: number
          task_prompt: string
          title: string
          updated_at: string
        }[]
      }
      fn_list_recent_incidents: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_run_incidents: {
        Args: {
          p_limit?: number
          p_resolved?: boolean
          p_run_report_id: string
          p_severity?: string
        }
        Returns: Json[]
      }
      fn_list_run_reports: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_scratchpad_runs: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_team_edges: { Args: { p_team_id: string }; Returns: Json[] }
      fn_list_template_workflows: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          author_display_name: string
          author_handle: string
          created_at: string
          description: string
          fork_count: number
          id: string
          kinds: string[]
          lenser_id: string
          node_count: number
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_list_threads: {
        Args: { p_cursor?: string; p_limit?: number; p_tag_slug?: string }
        Returns: {
          author_lenser_id: string
          content: string
          created_at: string
          id: string
          lens_data: Json
          lenser_handle: string
          lenser_id: string
          linked_lens_id: string
          reply_count: number
          thumbnail_url: string
          title: string
          updated_at: string
          view_count: number
          visibility: string
        }[]
      }
      fn_list_tool_assignments: {
        Args: { p_ai_lenser_id: string }
        Returns: Json[]
      }
      fn_list_tool_profiles: {
        Args: { p_ai_lenser_id: string }
        Returns: Json[]
      }
      fn_list_tools: { Args: { p_category?: string }; Returns: Json }
      fn_list_tools_registry: {
        Args: { p_owner_lenser_id: string }
        Returns: Json[]
      }
      fn_list_tournaments: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_workflow_assignments: {
        Args: { p_ai_lenser_id: string; p_cursor?: string; p_limit?: number }
        Returns: Json[]
      }
      fn_list_workflow_phases: {
        Args: { p_workflow_id: string }
        Returns: Json[]
      }
      fn_list_workflow_run_events: {
        Args: { p_after_event_id?: number; p_limit?: number; p_run_id: string }
        Returns: {
          event_id: number
          occurred_at: string
          payload: Json
          run_id: string
          type: string
        }[]
      }
      fn_list_workflow_runs: {
        Args: { p_limit?: number; p_offset?: number; p_workflow_id: string }
        Returns: {
          completed_at: string
          created_at: string
          global_model_id: string
          id: string
          spent_credits: number
          started_at: string
          status: string
          trigger_mode: string
          workflow_id: string
        }[]
      }
      fn_list_workflow_tasks: { Args: { p_phase_id: string }; Returns: Json[] }
      fn_list_workflow_tasks_by_workflow: {
        Args: { p_workflow_id: string }
        Returns: Json[]
      }
      fn_log_artifact_lifecycle_event: {
        Args: {
          p_action: string
          p_actor_id: string
          p_artifact_id: string
          p_artifact_type: string
          p_payload?: Json
        }
        Returns: undefined
      }
      fn_log_model_test_run: {
        Args: {
          p_battle_id: string
          p_duration_ms: number
          p_model_id: string
          p_model_provider: string
          p_passed: boolean
          p_prompt_hash: string
          p_raw_output?: Json
          p_template_id: string
          p_violations?: Json
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'model_test_runs'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_log_page_view: {
        Args: {
          p_client_ip: unknown
          p_path: string
          p_referrer: string
          p_target_id: string
          p_target_type: Database['public']['Enums']['page_view_target_enum']
          p_user_agent: string
        }
        Returns: undefined
      }
      fn_mark_notifications_read: {
        Args: { p_notification_ids: string[] }
        Returns: number
      }
      fn_mark_tutorial_complete: {
        Args: { p_kind?: string; p_tutorial_slug: string }
        Returns: Json
      }
      fn_media_bind_attachment: {
        Args: {
          p_binding_key?: string
          p_entity_id: string
          p_entity_type: string
          p_object_id: string
        }
        Returns: string
      }
      fn_media_finalize_upload: {
        Args: {
          p_bucket: string
          p_byte_size?: number
          p_checksum?: string
          p_object_id: string
          p_object_key: string
        }
        Returns: undefined
      }
      fn_media_proxy_log: { Args: { p_object_id: string }; Returns: undefined }
      fn_media_soft_delete: {
        Args: { p_object_id: string }
        Returns: undefined
      }
      fn_media_unbind_attachment: {
        Args: {
          p_binding_key?: string
          p_entity_id: string
          p_entity_type: string
        }
        Returns: undefined
      }
      fn_move_battle_job_to_dlq: {
        Args: { p_error_code?: string; p_error_msg?: string; p_job_id: string }
        Returns: string
      }
      fn_notify_battle_result: {
        Args: { p_battle_id: string }
        Returns: undefined
      }
      fn_oauth_get_connection_for_refresh: {
        Args: { p_lenser_id: string; p_ref: string; p_workspace_id?: string }
        Returns: Json
      }
      fn_oauth_list_connections: {
        Args: never
        Returns: {
          capability: string
          connection_label: string
          created_at: string
          expires_at: string
          granted_scopes: string[]
          id: string
          is_active: boolean
          provider: string
          ref: string
          updated_at: string
          workspace_id: string
        }[]
      }
      fn_oauth_resolve_connection: {
        Args: {
          p_lenser_id: string
          p_ref: string
          p_required_scopes?: string[]
          p_workspace_id?: string
        }
        Returns: string
      }
      fn_oauth_revoke_connection: {
        Args: { p_connection_id: string }
        Returns: undefined
      }
      fn_oauth_upsert_connection: {
        Args: {
          p_access_token: string
          p_capability: string
          p_expires_at?: string
          p_granted_scopes?: string[]
          p_label: string
          p_lenser_id: string
          p_provider: string
          p_refresh_token?: string
          p_workspace_id: string
        }
        Returns: string
      }
      fn_ops_submit_contact: {
        Args: {
          p_email: string
          p_ip_address?: string
          p_kvkk_approved?: boolean
          p_message: string
          p_name: string
          p_subject: string
          p_user_agent?: string
        }
        Returns: undefined
      }
      fn_pause_agent: { Args: { p_ai_lenser_id: string }; Returns: undefined }
      fn_post_battle_comment: {
        Args: { p_battle_id: string; p_body: string }
        Returns: {
          battle_id: string
          body: string
          created_at: string
          id: string
          lenser_id: string
          updated_at: string
        }[]
      }
      fn_post_global_message: {
        Args: {
          p_battle_id: string
          p_body: string
          p_sender_handle: string
          p_sender_role?: string
        }
        Returns: {
          battle_id: string
          body: string
          created_at: string
          id: string
          sender_handle: string
          sender_id: string
          sender_role: string
        }[]
      }
      fn_profile_completion_score: {
        Args: { p_lenser_id: string }
        Returns: number
      }
      fn_promote_scratchpad_to_memory: {
        Args: { p_memory_profile_id: string; p_run_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'memory_profiles'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_publish_battle: { Args: { p_battle_id: string }; Returns: Json }
      fn_publish_workflow_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      fn_purge_due_accounts: { Args: never; Returns: number }
      fn_queue_freeze: { Args: { p_reason: string }; Returns: undefined }
      fn_queue_unfreeze: { Args: never; Returns: undefined }
      fn_read_memory_entries: {
        Args: {
          p_limit?: number
          p_profile_id: string
          p_scope?: string
          p_team_run_id?: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'memories'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_record_run_incident: {
        Args: {
          p_context?: Json
          p_description: string
          p_incident_type: string
          p_run_report_id: string
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      fn_record_run_provenance: {
        Args: {
          p_source_node_id: string
          p_source_output_path: string
          p_source_run_id: string
          p_target_input_path: string
          p_target_node_id: string
          p_target_run_id: string
          p_transform?: Json
        }
        Returns: string
      }
      fn_record_scoring_plugin_signal: {
        Args: { p_battle_id: string; p_plugin_id: string; p_signals: Json }
        Returns: undefined
      }
      fn_record_signed_attestation: {
        Args: {
          p_agent_config_hash?: string
          p_canonical_jcs_b64url: string
          p_cli_version?: string
          p_envelope_iat: string
          p_envelope_kid: string
          p_envelope_nonce: string
          p_lens_hash?: string
          p_policy_passed?: boolean
          p_run_id: string
          p_runner_version?: string
          p_signature_b64url: string
          p_workflow_hash?: string
        }
        Returns: string
      }
      fn_redact_memory_entry: {
        Args: { p_memory_id: string; p_reason?: string }
        Returns: undefined
      }
      fn_redacted_agent_snapshot: {
        Args: { p_ai_lenser_id: string }
        Returns: Json
      }
      fn_redacted_agent_snapshot_hash: {
        Args: { p_ai_lenser_id: string }
        Returns: string
      }
      fn_register_tool: {
        Args: {
          p_auth_method?: string
          p_category?: string
          p_description?: string
          p_is_dangerous?: boolean
          p_key: string
          p_name: string
          p_requires_approval?: boolean
          p_schema_input?: Json
          p_schema_output?: Json
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'tools_registry'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_register_tournament_contender: {
        Args: { p_lenser_id?: string; p_tournament_id: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'tournament_contenders'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_reject_follow_request: {
        Args: { p_source_profile_id: string }
        Returns: Json
      }
      fn_reject_tool_invocation: {
        Args: { p_invocation_id: string; p_reason?: string }
        Returns: undefined
      }
      fn_remap_thread_tags: {
        Args: { p_tag_ids: string[]; p_thread_id: string }
        Returns: undefined
      }
      fn_remove_battle_contender: {
        Args: { p_contender_id: string }
        Returns: undefined
      }
      fn_remove_follow: { Args: { p_target_profile_id: string }; Returns: Json }
      fn_reorder_workflow_phases: {
        Args: { p_ordered_ids: string[]; p_workflow_id: string }
        Returns: undefined
      }
      fn_reorder_workflow_tasks: {
        Args: { p_ordered_ids: string[]; p_phase_id: string }
        Returns: undefined
      }
      fn_request_follow: {
        Args: { p_target_profile_id: string }
        Returns: Json
      }
      fn_request_workspace_deletion: {
        Args: { p_ai_lenser_id: string; p_reason?: string }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'workspace_settings'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_requeue_battle_job_with_backoff: {
        Args: { p_backoff_ms: number; p_error?: string; p_job_id: string }
        Returns: undefined
      }
      fn_resolve_execution_model: {
        Args: { p_model_override?: string; p_provider_override?: string }
        Returns: {
          model_id: string
          model_key: string
          provider_id: string
          provider_key: string
        }[]
      }
      fn_resolve_handle_to_email: {
        Args: { p_handle: string }
        Returns: string
      }
      fn_resolve_mentions: {
        Args: { p_ids: string[] }
        Returns: {
          id: string
          link: string
          title: string
        }[]
      }
      fn_resolve_run_incident: {
        Args: { p_incident_id: string; p_resolution: string }
        Returns: undefined
      }
      fn_resolve_vote_anomaly: {
        Args: { p_anomaly_id: string }
        Returns: undefined
      }
      fn_restore_agent: { Args: { p_ai_lenser_id: string }; Returns: Json }
      fn_restore_lens: { Args: { p_lens_id: string }; Returns: Json }
      fn_restore_workflow: { Args: { p_workflow_id: string }; Returns: Json }
      fn_restore_workflow_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      fn_resume_agent: { Args: { p_ai_lenser_id: string }; Returns: undefined }
      fn_retry_agent_run: {
        Args: { p_ai_lenser_id: string; p_run_id: string }
        Returns: string
      }
      fn_retry_dead_letter_battle_job: {
        Args: { p_dead_letter_id: string }
        Returns: undefined
      }
      fn_revoke_agent_ownership: {
        Args: { p_ownership_id: string }
        Returns: undefined
      }
      fn_revoke_api_key: { Args: { p_key_id: string }; Returns: undefined }
      fn_revoke_standing_approval: {
        Args: { p_id: string }
        Returns: undefined
      }
      fn_revoke_tool: {
        Args: { p_ai_lenser_id: string; p_tool_id: string }
        Returns: boolean
      }
      fn_rls_unprotected_tables: {
        Args: never
        Returns: {
          schema_name: string
          table_name: string
        }[]
      }
      fn_run_evaluation: {
        Args: { p_evaluation_id: string; p_model_id?: string }
        Returns: string
      }
      fn_run_lens: {
        Args: {
          p_byok_key_id?: string
          p_funding_source?: string
          p_idempotency_key?: string
          p_inputs?: Json
          p_lens_id: string
          p_model_id: string
          p_version_id: string
        }
        Returns: string
      }
      fn_runner_bind_device: {
        Args: { p_device_id: string; p_runner_id: string }
        Returns: string
      }
      fn_runner_enable: { Args: { p_adapter_id: string }; Returns: undefined }
      fn_runner_get: {
        Args: { p_adapter_id: string }
        Returns: {
          adapter_type: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_probe_status: string
          last_probed_at: string
          name: string
          updated_at: string
        }[]
      }
      fn_runner_list: {
        Args: never
        Returns: {
          adapter_type: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }[]
      }
      fn_runner_probe: {
        Args: { p_adapter_id: string; p_prompt?: string }
        Returns: Json
      }
      fn_runner_register: {
        Args: { p_adapter_type: string; p_config?: Json; p_name: string }
        Returns: string
      }
      fn_runner_remove: { Args: { p_adapter_id: string }; Returns: undefined }
      fn_save_workflow_node_config: {
        Args: { p_config: Json; p_node_id: string }
        Returns: undefined
      }
      fn_schedule_account_deletion: { Args: never; Returns: Json }
      fn_schedule_battle: {
        Args: {
          p_auto_publish?: boolean
          p_battle_id: string
          p_execution_starts_at: string
          p_voting_duration_hours?: number
        }
        Returns: {
          auto_publish: boolean
          battle_type: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          forum_thread_id: string
          handicap_config: Json
          id: string
          lens_id: string
          og_image_url: string
          parent_battle_id: string
          published_at: string
          slug: string
          status: string
          task_prompt: string
          title: string
          total_vote_count: number
          vote_velocity: number
          voter_eligibility: string
          voting_closes_at: string
          voting_duration_hours: number
          voting_opens_at: string
          winner_contender_id: string
          workflow_id: string
        }[]
      }
      fn_search_lensers: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          handle: string
          id: string
          type: 'human' | 'ai'
        }[]
      }
      fn_search_memory_entries: {
        Args: { p_limit?: number; p_profile_id?: string; p_query: string }
        Returns: {
          ai_lenser_id: string
          confidence: number
          content: string
          created_at: string
          id: string
          is_redacted: boolean
          profile_id: string
          rank: number
          scope: string
          source: string
        }[]
      }
      fn_security_definer_no_search_path: {
        Args: never
        Returns: {
          full_signature: string
          function_name: string
          schema_name: string
        }[]
      }
      fn_set_evaluation_baseline: {
        Args: { p_evaluation_id: string; p_run_id: string }
        Returns: Json
      }
      fn_set_runner_paused: {
        Args: { p_ai_lenser_id: string; p_paused: boolean }
        Returns: undefined
      }
      fn_set_schedule_calendar: {
        Args: { p_calendar_id: string; p_schedule_id: string }
        Returns: undefined
      }
      fn_set_schedule_condition: {
        Args: { p_condition: Json; p_schedule_id: string }
        Returns: undefined
      }
      fn_set_schedule_inputs_rotation: {
        Args: { p_rotation: Json; p_schedule_id: string }
        Returns: undefined
      }
      fn_set_webhook_signing_secret: {
        Args: { p_secret: string }
        Returns: undefined
      }
      fn_set_webhook_strict_signing: {
        Args: { p_strict: boolean }
        Returns: undefined
      }
      fn_should_send_notification: {
        Args: { p_actor_id: string; p_recipient_id: string; p_type: string }
        Returns: boolean
      }
      fn_start_tournament: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      fn_start_workflow_run: {
        Args: {
          p_global_model_id?: string
          p_idempotency_key?: string
          p_inputs?: Json
          p_version_id?: string
          p_workflow_id: string
        }
        Returns: string
      }
      fn_store_api_key: {
        Args: { p_label?: string; p_provider: string; p_raw_key?: string }
        Returns: string
      }
      fn_submit_contender_entry: {
        Args: {
          p_battle_id: string
          p_contender_id: string
          p_content_text: string
        }
        Returns: {
          battle_id: string
          contender_id: string
          content_text: string
          content_url: string
          id: string
          status: string
        }[]
      }
      fn_submit_vote:
        | {
            Args: {
              p_battle_id: string
              p_is_draw?: boolean
              p_rationale?: string
              p_vote_value: 'contender_a' | 'contender_b' | 'draw'
              p_voted_contender_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_battle_id: string
              p_is_draw?: boolean
              p_rationale?: string
              p_vote_value: string
              p_voted_contender_id: string
            }
            Returns: Json
          }
      fn_summarize_memory_profile: {
        Args: { p_profile_id: string }
        Returns: Json
      }
      fn_switch_active_lenser: {
        Args: { p_lenser_id: string }
        Returns: undefined
      }
      fn_sync_pull: {
        Args: { p_envelope: Json; p_limit?: number; p_object_classes: string[] }
        Returns: {
          created_at: string
          id: string
          object_class: string
          object_id: string
          op: string
          payload: Json
          vclock: Json
        }[]
      }
      fn_sync_push: {
        Args: { p_envelope: Json }
        Returns: {
          applied_count: number
          rejected_count: number
          rejections: Json
        }[]
      }
      fn_sync_status: {
        Args: { p_device_id: string }
        Returns: {
          last_error: string
          object_class: string
          outbox_depth: number
          watermark: string
        }[]
      }
      fn_tag_activity_log: { Args: { p_events: Json }; Returns: undefined }
      fn_tag_workflow_run: {
        Args: {
          p_metadata?: Json
          p_node_id?: string
          p_run_id: string
          p_severity?: string
          p_tag: string
        }
        Returns: string
      }
      fn_tags_get_cloud: {
        Args: { p_limit?: number }
        Returns: {
          created_at: string
          created_count: number
          id: string
          name: string
          reacted_count: number
          slug: string
          total_usage: number
          trend_score_7d: number
          viewed_count: number
          visibility: string
        }[]
      }
      fn_tags_search: {
        Args: { p_lang?: string; p_limit?: number; p_query: string }
        Returns: {
          id: string
          lang_match: boolean
          name: string
          slug: string
          total_usage: number
          visibility: string
        }[]
      }
      fn_templates_set_recurrence: {
        Args: {
          p_auto_start_delay_hours?: number
          p_next_run_at?: string
          p_recurrence_rule: string
          p_template_id: string
        }
        Returns: undefined
      }
      fn_timeout_stale_runs: {
        Args: { p_stale_threshold_hours?: number }
        Returns: number
      }
      fn_timeout_stale_runs_safe: { Args: never; Returns: undefined }
      fn_toggle_automation_rule: {
        Args: { p_is_active: boolean; p_rule_id: string }
        Returns: {
          action_config: Json
          action_kind: string
          created_at: string
          id: string
          is_active: boolean
          lenser_id: string
          match_event_type: string
          match_filter: Json
          name: string
          updated_at: string
        }[]
      }
      fn_toggle_battle_template_public: {
        Args: { p_is_public: boolean; p_template_id: string }
        Returns: undefined
      }
      fn_toggle_kill_switch: {
        Args: { p_ai_lenser_id: string; p_enabled: boolean }
        Returns: undefined
      }
      fn_toggle_media_visibility: {
        Args: { p_object_id: string; p_visibility: string }
        Returns: undefined
      }
      fn_toggle_workflow_schedule: {
        Args: { p_is_active: boolean; p_schedule_id: string }
        Returns: undefined
      }
      fn_transfer_media_ownership: {
        Args: { p_new_owner_id: string; p_object_id: string }
        Returns: undefined
      }
      fn_unblock_profile: {
        Args: { p_target_profile_id: string }
        Returns: Json
      }
      fn_update_agent_personality: {
        Args: { p_ai_lenser_id: string; p_personality_note: string }
        Returns: undefined
      }
      fn_update_agent_policy: {
        Args: { p_ai_lenser_id: string; p_patch: Json }
        Returns: undefined
      }
      fn_update_agent_profile: {
        Args: { p_ai_lenser_id: string; p_patch: Json }
        Returns: undefined
      }
      fn_update_battle: {
        Args: {
          p_battle_id: string
          p_battle_type?: string
          p_challenge_type?: string
          p_contender_structure?: string
          p_forum_thread_id?: string
          p_handicap_config?: Json
          p_judging_mode?: string
          p_lens_id?: string
          p_lenser_battle_policy?: Json
          p_shared_input_snapshot?: Json
          p_task_prompt?: string
          p_task_source?: string
          p_title?: string
          p_voter_eligibility?: string
          p_workflow_id?: string
        }
        Returns: {
          auto_publish: boolean
          battle_type: string
          challenge_type: string
          contender_structure: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          forum_thread_id: string
          handicap_config: Json
          id: string
          judging_mode: string
          lens_id: string
          lenser_battle_policy: Json
          og_image_url: string
          parent_battle_id: string
          published_at: string
          shared_input_snapshot: Json
          slug: string
          status: string
          task_prompt: string
          task_source: string
          title: string
          total_vote_count: number
          vote_velocity: number
          voter_eligibility: string
          voting_closes_at: string
          voting_duration_hours: number
          voting_opens_at: string
          winner_contender_id: string
          workflow_id: string
        }[]
      }
      fn_update_battle_execution_settings: {
        Args: {
          p_auto_publish: boolean
          p_battle_id: string
          p_execution_starts_at: string
          p_voting_duration_hours: number
        }
        Returns: undefined
      }
      fn_update_team_member_role: {
        Args: { p_member_id: string; p_role: string; p_team_id: string }
        Returns: undefined
      }
      fn_update_team_run_status: {
        Args: {
          p_completed_at?: string
          p_status: string
          p_team_run_id: string
        }
        Returns: undefined
      }
      fn_update_thread_translation: {
        Args: { p_content: string; p_thread_id: string; p_title: string }
        Returns: undefined
      }
      fn_update_thread_visibility: {
        Args: { p_thread_id: string; p_visibility: string }
        Returns: undefined
      }
      fn_update_workflow: {
        Args: {
          p_description?: string
          p_title: string
          p_visibility?: string
          p_workflow_id: string
        }
        Returns: {
          battle_count: number
          created_at: string
          description: string
          id: string
          lenser_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_update_workflow_node_result:
        | {
            Args: {
              p_duration_ms?: number
              p_error_message?: string
              p_node_id: string
              p_output_data?: Json
              p_retry_count?: number
              p_run_id: string
              p_status: string
              p_ttfb_ms?: number
            }
            Returns: undefined
          }
        | {
            Args: {
              p_duration_ms?: number
              p_error_message?: string
              p_node_id: string
              p_output_data?: Json
              p_retry_count?: number
              p_run_id: string
              p_status: string
              p_ttfb_ms?: number
              p_waiting_reason?: string
            }
            Returns: undefined
          }
      fn_update_workflow_run_status: {
        Args: { p_run_id: string; p_status: string }
        Returns: undefined
      }
      fn_update_workspace_settings: {
        Args: { p_ai_lenser_id: string; p_patch: Json }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'workspace_settings'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_upsert_agent_lens_binding:
        | {
            Args: {
              p_ai_lenser_id: string
              p_is_default?: boolean
              p_lens_id: string
              p_version_id?: string
            }
            Returns: unknown[]
            SetofOptions: {
              from: '*'
              to: 'lens_bindings'
              isOneToOne: false
              isSetofReturn: true
            }
          }
        | {
            Args: {
              p_ai_lenser_id: string
              p_category_tags?: string[]
              p_is_default?: boolean
              p_lens_id: string
              p_version_id?: string
            }
            Returns: unknown[]
            SetofOptions: {
              from: '*'
              to: 'lens_bindings'
              isOneToOne: false
              isSetofReturn: true
            }
          }
      fn_upsert_agent_model_binding: {
        Args: {
          p_ai_lenser_id: string
          p_is_default?: boolean
          p_model_id: string
        }
        Returns: unknown[]
        SetofOptions: {
          from: '*'
          to: 'model_bindings'
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_upsert_agent_ownership: {
        Args: {
          p_ai_lenser_id: string
          p_owner_lenser_id: string
          p_permission_scope?: string[]
          p_role: string
        }
        Returns: {
          ai_lenser_id: string
          granted_at: string
          id: string
          owner_avatar_url: string
          owner_display_name: string
          owner_handle: string
          owner_lenser_id: string
          permission_scope: string[]
          revoked_at: string
          role: string
        }[]
      }
      fn_upsert_agent_run_step: {
        Args: {
          p_blocker_summary?: string
          p_completed_at?: string
          p_current_task?: string
          p_lane: number
          p_recent_output_summary?: string
          p_started_at?: string
          p_status: string
          p_team_run_id: string
          p_title: string
          p_workflow_node_id: string
        }
        Returns: Json
      }
      fn_upsert_battle_execution_config: {
        Args: {
          p_battle_id: string
          p_byok_key_ref_id?: string
          p_contender_id: string
          p_funding_source?: string
          p_max_tokens?: number
          p_model_id?: string
          p_model_key: string
          p_provider_key: string
          p_temperature?: number
        }
        Returns: Json
      }
      fn_upsert_notification_preference: {
        Args: { p_enabled: boolean; p_type: string }
        Returns: undefined
      }
      fn_upsert_provider_config: {
        Args: {
          p_ai_key_id?: string
          p_ai_lenser_id: string
          p_base_url?: string
          p_provider_key: string
          p_status?: string
        }
        Returns: unknown
        SetofOptions: {
          from: '*'
          to: 'provider_configs'
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_upsert_workflow_edges: {
        Args: { p_edges: Json; p_workflow_id: string }
        Returns: {
          id: string
          source_node_id: string
          source_output_key: string
          target_node_id: string
          target_param_label: string
          workflow_id: string
        }[]
      }
      fn_upsert_workflow_nodes: {
        Args: { p_nodes: Json; p_workflow_id: string }
        Returns: {
          config: Json
          created_at: string
          id: string
          label: string
          lens_id: string
          ordinal: number
          position_x: number
          position_y: number
          version_id: string
          workflow_id: string
        }[]
      }
      fn_upsert_workflow_phase: {
        Args: {
          p_description?: string
          p_id?: string
          p_ordinal?: number
          p_title: string
          p_workflow_id: string
        }
        Returns: Json
      }
      fn_upsert_workflow_schedule: {
        Args: {
          p_approval_policy?: Json
          p_assignee_id?: string
          p_cron_expr?: string
          p_description?: string
          p_failure_policy?: Json
          p_global_model_id?: string
          p_inputs_template?: Json
          p_is_active?: boolean
          p_queue_policy?: Json
          p_retry_policy?: Json
          p_schedule_id?: string
          p_timezone?: string
          p_workflow_assignment_id?: string
          p_workflow_id: string
        }
        Returns: {
          approval_policy: Json
          assignee_id: string
          assignee_type: string
          created_at: string
          cron_expr: string
          description: string
          failure_policy: Json
          global_model_id: string
          id: string
          inputs_template: Json
          is_active: boolean
          last_completed_at: string
          last_dispatch_status: string
          last_error_at: string
          last_error_message: string
          last_result: Json
          last_run_at: string
          last_run_id: string
          next_run_at: string
          queue_policy: Json
          retry_policy: Json
          timezone: string
          workflow_assignment_id: string
          workflow_id: string
        }[]
      }
      fn_upsert_workflow_task: {
        Args: {
          p_id?: string
          p_model_hint?: string
          p_ordinal?: number
          p_output_type?: string
          p_phase_id: string
          p_prompt_text?: string
          p_title: string
          p_workflow_id: string
        }
        Returns: Json
      }
      fn_upsert_workspace_item: {
        Args: { p_id: string; p_patch: Json; p_table_name: string }
        Returns: Json
      }
      fn_worker_battle_job_to_dlq: {
        Args: { p_error_code: string; p_error_msg?: string; p_job_id: string }
        Returns: string
      }
      fn_worker_claim_battle_job: {
        Args: { p_worker_id: string }
        Returns: {
          ai_lenser_id: string
          battle_id: string
          byok_key_ref_id: string
          contender_id: string
          job_id: string
          lens_id: string
          max_tokens: number
          model_key: string
          personality_note: string
          personality_version_id: string
          provider_key: string
          retry_count: number
          slot: string
          task_prompt: string
          temperature: number
          version_id: string
        }[]
      }
      fn_worker_claim_queued_run: { Args: never; Returns: Json }
      fn_worker_claim_scheduled_workflow_run: {
        Args: { p_worker_id: string }
        Returns: {
          ai_lenser_id: string
          inputs: Json
          model_id: string
          run_id: string
          schedule_id: string
          workflow_id: string
        }[]
      }
      fn_worker_claim_team_run: { Args: never; Returns: Json }
      fn_worker_complete_battle_job: {
        Args: {
          p_error?: string
          p_job_id: string
          p_output_text?: string
          p_status: string
        }
        Returns: undefined
      }
      fn_worker_complete_execution_run: {
        Args: {
          p_billing_status?: string
          p_credit_cost?: number
          p_error_code?: string
          p_error_message?: string
          p_latency_ms?: number
          p_response_meta?: Json
          p_response_text?: string
          p_run_id: string
          p_status: string
          p_token_input?: number
          p_token_output?: number
        }
        Returns: undefined
      }
      fn_worker_decrypt_api_key: { Args: { p_key_id: string }; Returns: string }
      fn_worker_fail_execution_run: {
        Args: {
          p_error_code?: string
          p_error_message?: string
          p_run_id: string
        }
        Returns: undefined
      }
      fn_worker_get_ai_key_secret: {
        Args: { p_ai_key_id: string; p_user_id: string }
        Returns: string
      }
      fn_worker_get_battle_for_judge: {
        Args: { p_battle_id: string }
        Returns: {
          ai_judge_model_key: string
          ai_judge_prompt: string
          id: string
          task_prompt: string
          title: string
        }[]
      }
      fn_worker_get_battle_for_og: {
        Args: { p_battle_id: string }
        Returns: {
          battle_type: string
          finalized_at: string
          id: string
          published_at: string
          slug: string
          status: string
          task_prompt: string
          title: string
          total_vote_count: number
          winner_contender_id: string
        }[]
      }
      fn_worker_get_delegation_context: {
        Args: { p_team_run_id: string }
        Returns: Json
      }
      fn_worker_get_lens_template_body: {
        Args: { p_lens_id: string; p_version_id?: string }
        Returns: string
      }
      fn_worker_get_team_run: { Args: { p_team_run_id: string }; Returns: Json }
      fn_worker_get_vote_risk_data: {
        Args: { p_battle_id: string; p_lenser_id: string }
        Returns: Json
      }
      fn_worker_get_voter_stats: {
        Args: { p_since_ts: string; p_voter_lenser_id: string }
        Returns: {
          draw_count: number
          recent_count: number
          total_count: number
        }[]
      }
      fn_worker_get_workflow_context: {
        Args: { p_run_id: string }
        Returns: {
          triggered_by: string
          workflow_id: string
        }[]
      }
      fn_worker_get_workflow_graph: {
        Args: { p_workflow_id: string }
        Returns: Json
      }
      fn_worker_insert_workflow_media_object: {
        Args: {
          p_external_url: string
          p_media_type: string
          p_mime_type: string
          p_name: string
          p_node_id: string
          p_owner_lenser_id: string
          p_run_id: string
          p_workspace_id: string
        }
        Returns: string
      }
      fn_worker_persist_execution_artifacts: {
        Args: {
          p_ai_model_id: string
          p_content_json?: Json
          p_content_text?: string
          p_kind: string
          p_lenser_id: string
          p_media_ids?: string[]
          p_run_id: string
          p_workspace_id: string
        }
        Returns: undefined
      }
      fn_worker_render_template: {
        Args: { p_inputs?: Json; p_version_id: string }
        Returns: string
      }
      fn_worker_requeue_battle_job: {
        Args: { p_backoff_ms: number; p_error?: string; p_job_id: string }
        Returns: undefined
      }
      fn_worker_run_auto_promote_cycle: { Args: never; Returns: number }
      fn_worker_set_battle_og_image: {
        Args: { p_battle_id: string; p_og_image_url: string }
        Returns: undefined
      }
      fn_worker_start_media_execution: {
        Args: {
          p_byok_key_ref_id?: string
          p_funding_source: string
          p_input_snapshot?: Json
          p_lens_id?: string
          p_origin_type: string
          p_user_id: string
        }
        Returns: {
          request_id: string
          run_id: string
        }[]
      }
      fn_worker_update_team_run: {
        Args: {
          p_completed_at?: string
          p_status: string
          p_team_run_id: string
        }
        Returns: undefined
      }
      fn_worker_update_team_run_status: {
        Args: {
          p_completed_at?: string
          p_status: string
          p_team_run_id: string
        }
        Returns: undefined
      }
      fn_worker_update_vote_risk_score: {
        Args: {
          p_review_status: string
          p_risk_factors: string[]
          p_risk_score: number
          p_vote_id: string
        }
        Returns: undefined
      }
      fn_worker_upsert_battle_submission: {
        Args: {
          p_artifact_id?: string
          p_battle_id: string
          p_contender_id: string
          p_content_text?: string
          p_execution_run_id?: string
          p_is_final?: boolean
          p_media_url?: string
          p_mime_type?: string
          p_output_modality?: string
        }
        Returns: undefined
      }
      fn_worker_upsert_heartbeat: {
        Args: { p_metadata?: Json; p_worker_id: string; p_worker_type: string }
        Returns: undefined
      }
      fn_worker_upsert_node_result:
        | {
            Args: {
              p_error_message?: string
              p_node_id: string
              p_output_data?: Json
              p_run_id: string
              p_status: string
            }
            Returns: undefined
          }
        | {
            Args: {
              p_error_message?: string
              p_node_id: string
              p_output_data?: Json
              p_provider_route?: Json
              p_resolved_input_snapshot?: Json
              p_run_id: string
              p_status: string
            }
            Returns: undefined
          }
      fn_workflows_chain_run: {
        Args: {
          p_child_workflow_id: string
          p_input?: Json
          p_parent_run_id: string
        }
        Returns: string
      }
      fn_workflows_dispatch_on_event: {
        Args: { p_event_payload: Json; p_event_type: string }
        Returns: number
      }
      fn_workflows_evaluate_condition: {
        Args: { p_condition: Json; p_event: Json }
        Returns: boolean
      }
      fn_workflows_get_popular: {
        Args: { p_limit?: number; p_offset?: number; p_search?: string }
        Returns: {
          battle_count: number
          created_at: string
          description: string
          fork_count: number
          hot_score: number
          id: string
          lenser_id: string
          node_count: number
          parent_workflow_id: string
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      fn_workflows_webhook_trigger: {
        Args: { p_payload?: Json; p_secret: string; p_workflow_id: string }
        Returns: string
      }
      fn_write_memory_entry: {
        Args: {
          p_confidence?: number
          p_content: string
          p_expires_at?: string
          p_metadata?: Json
          p_profile_id: string
          p_scope: string
          p_source: string
          p_team_run_id?: string
        }
        Returns: string
      }
      fn_xp_freeze_content: {
        Args: { p_source_ref_id: string; p_source_ref_type: string }
        Returns: number
      }
      fn_xp_get_apps: {
        Args: never
        Returns: {
          difficulty: string
          id: string
          is_active: boolean
          name: string
          slug: string
        }[]
      }
      fn_xp_get_contributions: {
        Args: { p_lenser_id?: string }
        Returns: {
          context: string
          contribution_type: string
          created_at: string
          external_ref: string
          id: string
          lenser_id: string
          title: string
          verified_by: string
          xp_event_id: string
        }[]
      }
      fn_xp_get_history: {
        Args: { p_lenser_id?: string; p_limit?: number }
        Returns: {
          action_key: string
          base_xp: number
          created_at: string
          id: string
          source: string
          xp: number
        }[]
      }
      fn_xp_get_level_ups: {
        Args: { p_lenser_id: string; p_limit?: number }
        Returns: {
          created_at: string
          id: string
          new_level: number
          old_level: number
          total_xp_at: number
        }[]
      }
      fn_xp_get_seasons: {
        Args: { p_app_id?: string }
        Returns: {
          description: string
          ends_at: string
          featured_challenges: Json
          id: string
          is_active: boolean
          name: string
          reward_description: string
          slug: string
          starts_at: string
          status: string
        }[]
      }
      fn_xp_get_self: {
        Args: never
        Returns: {
          current_level: number
          lenser_id: string
          total_xp: number
        }[]
      }
      fn_xp_get_streak: {
        Args: { p_lenser_id: string; p_streak_type?: string }
        Returns: {
          best_streak: number
          current_streak: number
          last_update_at: string
          lenser_id: string
          streak_type: string
        }[]
      }
      fn_xp_get_summary: {
        Args: { p_app_id?: string; p_lenser_id?: string }
        Returns: {
          app_id: string
          current_level: number
          max_total_xp: number
          min_total_xp: number
          total_xp: number
        }[]
      }
      get_active_models_by_provider: {
        Args: { p_provider_key: string }
        Returns: {
          capabilities: string[]
          context_window_tokens: number
          created_at: string
          id: string
          key: string
          name: string
          provider_key: string
          provider_name: string
          supports_json_schema: boolean
          supports_tools: boolean
          supports_vision: boolean
        }[]
      }
      get_active_providers: {
        Args: never
        Returns: {
          base_url: string
          created_at: string
          display_name: string
          docs_url: string
          id: string
          key: string
          metadata: Json
          updated_at: string
        }[]
      }
      get_model_info: {
        Args: { p_model_key: string; p_provider_key: string }
        Returns: {
          model_id: string
          unit_type: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      list_tags_stats: {
        Args: { p_lang?: string; p_limit?: number; p_offset?: number }
        Returns: {
          created_at: string
          created_count: number
          id: string
          language_code: string
          name: string
          reacted_count: number
          slug: string
          total_usage: number
          trend_score: number
          viewed_count: number
        }[]
      }
    }
    Enums: {
      page_view_target_enum: 'thread' | 'thread_reply' | 'lens' | 'profile' | 'page' | 'battle'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      page_view_target_enum: ['thread', 'thread_reply', 'lens', 'profile', 'page', 'battle'],
    },
  },
} as const
