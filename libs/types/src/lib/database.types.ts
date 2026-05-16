export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  agents: {
    Tables: {
      action_logs: {
        Row: {
          action_type: string
          ai_lenser_id: string
          context_ref_id: string | null
          context_ref_type: string | null
          id: string
          metadata: Json
          occurred_at: string
          result: string
        }
        Insert: {
          action_type: string
          ai_lenser_id: string
          context_ref_id?: string | null
          context_ref_type?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          result?: string
        }
        Update: {
          action_type?: string
          ai_lenser_id?: string
          context_ref_id?: string | null
          context_ref_type?: string | null
          id?: string
          metadata?: Json
          occurred_at?: string
          result?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "action_logs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "action_logs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_run_events: {
        Row: {
          agent_run_step_id: string | null
          event_type: string
          id: string
          occurred_at: string
          payload: Json
          team_run_id: string
        }
        Insert: {
          agent_run_step_id?: string | null
          event_type: string
          id?: string
          occurred_at?: string
          payload?: Json
          team_run_id: string
        }
        Update: {
          agent_run_step_id?: string | null
          event_type?: string
          id?: string
          occurred_at?: string
          payload?: Json
          team_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_events_agent_run_step_id_fkey"
            columns: ["agent_run_step_id"]
            isOneToOne: false
            referencedRelation: "agent_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      agent_run_steps: {
        Row: {
          blocker_summary: string | null
          completed_at: string | null
          created_at: string
          current_task: string | null
          id: string
          lane: number
          payload: Json
          recent_output_summary: string | null
          started_at: string | null
          status: string
          team_member_id: string | null
          team_run_id: string
          title: string
          updated_at: string
          workflow_node_id: string | null
        }
        Insert: {
          blocker_summary?: string | null
          completed_at?: string | null
          created_at?: string
          current_task?: string | null
          id?: string
          lane?: number
          payload?: Json
          recent_output_summary?: string | null
          started_at?: string | null
          status?: string
          team_member_id?: string | null
          team_run_id: string
          title?: string
          updated_at?: string
          workflow_node_id?: string | null
        }
        Update: {
          blocker_summary?: string | null
          completed_at?: string | null
          created_at?: string
          current_task?: string | null
          id?: string
          lane?: number
          payload?: Json
          recent_output_summary?: string | null
          started_at?: string | null
          status?: string
          team_member_id?: string | null
          team_run_id?: string
          title?: string
          updated_at?: string
          workflow_node_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_steps_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_steps_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_run_steps_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_steps_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      ai_lensers: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          personality_note: string | null
          profile_id: string
          runtime_pref: string
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          personality_note?: string | null
          profile_id: string
          runtime_pref?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          personality_note?: string | null
          profile_id?: string
          runtime_pref?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      battle_subscriptions: {
        Row: {
          active: boolean
          agent_id: string
          category: string | null
          created_at: string
          execution_mode: string
          id: string
          max_joins_per_day: number
          require_owner_approval: boolean
          updated_at: string
          workflow_id: string | null
        }
        Insert: {
          active?: boolean
          agent_id: string
          category?: string | null
          created_at?: string
          execution_mode?: string
          id?: string
          max_joins_per_day?: number
          require_owner_approval?: boolean
          updated_at?: string
          workflow_id?: string | null
        }
        Update: {
          active?: boolean
          agent_id?: string
          category?: string | null
          created_at?: string
          execution_mode?: string
          id?: string
          max_joins_per_day?: number
          require_owner_approval?: boolean
          updated_at?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battle_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "battle_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_baselines: {
        Row: {
          evaluation_id: string
          id: string
          run_id: string
          score: number | null
          set_at: string
          set_by: string | null
        }
        Insert: {
          evaluation_id: string
          id?: string
          run_id: string
          score?: number | null
          set_at?: string
          set_by?: string | null
        }
        Update: {
          evaluation_id?: string
          id?: string
          run_id?: string
          score?: number | null
          set_at?: string
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_baselines_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: true
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_baselines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_results_v"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "evaluation_baselines_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_case_results: {
        Row: {
          case_id: string
          created_at: string
          error: string | null
          evaluation_run_id: string
          id: string
          output: Json | null
          passed: boolean | null
          score: number | null
        }
        Insert: {
          case_id: string
          created_at?: string
          error?: string | null
          evaluation_run_id: string
          id?: string
          output?: Json | null
          passed?: boolean | null
          score?: number | null
        }
        Update: {
          case_id?: string
          created_at?: string
          error?: string | null
          evaluation_run_id?: string
          id?: string
          output?: Json | null
          passed?: boolean | null
          score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_case_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "evaluation_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_case_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "evaluation_results_v"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "evaluation_case_results_evaluation_run_id_fkey"
            columns: ["evaluation_run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_results_v"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "evaluation_case_results_evaluation_run_id_fkey"
            columns: ["evaluation_run_id"]
            isOneToOne: false
            referencedRelation: "evaluation_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_cases: {
        Row: {
          created_at: string
          evaluation_id: string
          expected: Json | null
          id: string
          input: Json
          tags: string[]
          weight: number
        }
        Insert: {
          created_at?: string
          evaluation_id: string
          expected?: Json | null
          id?: string
          input?: Json
          tags?: string[]
          weight?: number
        }
        Update: {
          created_at?: string
          evaluation_id?: string
          expected?: Json | null
          id?: string
          input?: Json
          tags?: string[]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_cases_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_rubrics: {
        Row: {
          created_at: string
          criteria: Json
          evaluation_id: string
          id: string
          is_current: boolean
          version: number
        }
        Insert: {
          created_at?: string
          criteria?: Json
          evaluation_id: string
          id?: string
          is_current?: boolean
          version?: number
        }
        Update: {
          created_at?: string
          criteria?: Json
          evaluation_id?: string
          id?: string
          is_current?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_rubrics_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_runs: {
        Row: {
          completed_at: string | null
          evaluation_id: string
          id: string
          model_id: string | null
          rubric_id: string | null
          score: number | null
          started_at: string
          status: string
          summary: Json
        }
        Insert: {
          completed_at?: string | null
          evaluation_id: string
          id?: string
          model_id?: string | null
          rubric_id?: string | null
          score?: number | null
          started_at?: string
          status?: string
          summary?: Json
        }
        Update: {
          completed_at?: string | null
          evaluation_id?: string
          id?: string
          model_id?: string | null
          rubric_id?: string | null
          score?: number | null
          started_at?: string
          status?: string
          summary?: Json
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluation_runs_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "evaluation_rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          ai_lenser_id: string | null
          created_at: string
          dataset_uri: string | null
          description: string | null
          id: string
          name: string
          owner_lenser_id: string
          scoring_rules: Json
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          ai_lenser_id?: string | null
          created_at?: string
          dataset_uri?: string | null
          description?: string | null
          id?: string
          name: string
          owner_lenser_id: string
          scoring_rules?: Json
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string | null
          created_at?: string
          dataset_uri?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_lenser_id?: string
          scoring_rules?: Json
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      gateway_commands: {
        Row: {
          acked_at: string | null
          claimed_at: string | null
          command_type: string
          created_at: string
          device_id: string
          envelope_nonce: string | null
          envelope_sig: string | null
          id: string
          payload: Json
        }
        Insert: {
          acked_at?: string | null
          claimed_at?: string | null
          command_type: string
          created_at?: string
          device_id: string
          envelope_nonce?: string | null
          envelope_sig?: string | null
          id?: string
          payload?: Json
        }
        Update: {
          acked_at?: string | null
          claimed_at?: string | null
          command_type?: string
          created_at?: string
          device_id?: string
          envelope_nonce?: string | null
          envelope_sig?: string | null
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "gateway_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "gateway_devices"
            referencedColumns: ["device_id"]
          },
          {
            foreignKeyName: "gateway_commands_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "v_gateway_device_health"
            referencedColumns: ["device_id"]
          },
        ]
      }
      gateway_devices: {
        Row: {
          approved_at: string | null
          created_at: string
          daemon_version: string | null
          device_id: string
          hostname: string | null
          key_rotated_at: string | null
          kill_switch: boolean
          last_seen_at: string | null
          owner_id: string
          public_key: string
          revoked_at: string | null
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          daemon_version?: string | null
          device_id: string
          hostname?: string | null
          key_rotated_at?: string | null
          kill_switch?: boolean
          last_seen_at?: string | null
          owner_id: string
          public_key: string
          revoked_at?: string | null
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          daemon_version?: string | null
          device_id?: string
          hostname?: string | null
          key_rotated_at?: string | null
          kill_switch?: boolean
          last_seen_at?: string | null
          owner_id?: string
          public_key?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      lens_bindings: {
        Row: {
          ai_lenser_id: string
          category_tags: string[]
          created_at: string
          id: string
          is_default: boolean
          lens_id: string
          version_id: string | null
        }
        Insert: {
          ai_lenser_id: string
          category_tags?: string[]
          created_at?: string
          id?: string
          is_default?: boolean
          lens_id: string
          version_id?: string | null
        }
        Update: {
          ai_lenser_id?: string
          category_tags?: string[]
          created_at?: string
          id?: string
          is_default?: boolean
          lens_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lens_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "lens_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      memories: {
        Row: {
          ai_lenser_id: string
          confidence: number
          content: string
          created_at: string
          embedding_metadata: Json
          expires_at: string | null
          id: string
          is_redacted: boolean
          profile_id: string
          scope: string
          source: string
          team_run_id: string | null
        }
        Insert: {
          ai_lenser_id: string
          confidence?: number
          content: string
          created_at?: string
          embedding_metadata?: Json
          expires_at?: string | null
          id?: string
          is_redacted?: boolean
          profile_id: string
          scope: string
          source: string
          team_run_id?: string | null
        }
        Update: {
          ai_lenser_id?: string
          confidence?: number
          content?: string
          created_at?: string
          embedding_metadata?: Json
          expires_at?: string | null
          id?: string
          is_redacted?: boolean
          profile_id?: string
          scope?: string
          source?: string
          team_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "memory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      memory_access_logs: {
        Row: {
          accessed_at: string
          action: string
          context: Json
          id: string
          memory_id: string
          team_run_id: string | null
        }
        Insert: {
          accessed_at?: string
          action: string
          context?: Json
          id?: string
          memory_id: string
          team_run_id?: string | null
        }
        Update: {
          accessed_at?: string
          action?: string
          context?: Json
          id?: string
          memory_id?: string
          team_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memory_access_logs_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_logs_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "memories_v"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_logs_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "memory_access_logs_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_access_logs_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      memory_profiles: {
        Row: {
          ai_lenser_id: string
          created_at: string
          id: string
          is_default: boolean
          isolation_mode: string
          name: string
          reset_policy: string
          retention_days: number
          scope_type: string
          seed: Json
          summary_strategy: string
          updated_at: string
          visibility: string
        }
        Insert: {
          ai_lenser_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          isolation_mode?: string
          name: string
          reset_policy?: string
          retention_days?: number
          scope_type?: string
          seed?: Json
          summary_strategy?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          ai_lenser_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          isolation_mode?: string
          name?: string
          reset_policy?: string
          retention_days?: number
          scope_type?: string
          seed?: Json
          summary_strategy?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "memory_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memory_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "memory_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      model_bindings: {
        Row: {
          ai_lenser_id: string
          byok_adapter: string | null
          category_tags: string[]
          created_at: string
          id: string
          is_default: boolean
          model_id: string
          ollama_endpoint: string | null
        }
        Insert: {
          ai_lenser_id: string
          byok_adapter?: string | null
          category_tags?: string[]
          created_at?: string
          id?: string
          is_default?: boolean
          model_id: string
          ollama_endpoint?: string | null
        }
        Update: {
          ai_lenser_id?: string
          byok_adapter?: string | null
          category_tags?: string[]
          created_at?: string
          id?: string
          is_default?: boolean
          model_id?: string
          ollama_endpoint?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "model_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "model_bindings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      model_profiles: {
        Row: {
          ai_lenser_id: string
          created_at: string
          id: string
          is_default: boolean
          model_id: string | null
          model_key: string | null
          name: string
          params: Json
          provider_key: string | null
          support_level: string
          updated_at: string
        }
        Insert: {
          ai_lenser_id: string
          created_at?: string
          id?: string
          is_default?: boolean
          model_id?: string | null
          model_key?: string | null
          name: string
          params?: Json
          provider_key?: string | null
          support_level?: string
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string
          created_at?: string
          id?: string
          is_default?: boolean
          model_id?: string | null
          model_key?: string | null
          name?: string
          params?: Json
          provider_key?: string | null
          support_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "model_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "model_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "model_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      ownerships: {
        Row: {
          ai_lenser_id: string
          granted_at: string
          id: string
          owner_lenser_id: string
          permission_scope: string[]
          revoked_at: string | null
          role: string
        }
        Insert: {
          ai_lenser_id: string
          granted_at?: string
          id?: string
          owner_lenser_id: string
          permission_scope?: string[]
          revoked_at?: string | null
          role?: string
        }
        Update: {
          ai_lenser_id?: string
          granted_at?: string
          id?: string
          owner_lenser_id?: string
          permission_scope?: string[]
          revoked_at?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ownerships_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ownerships_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "ownerships_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      personality_profiles: {
        Row: {
          ai_lenser_id: string
          autonomy_level: string
          communication_style: string
          created_at: string
          decision_style: string
          escalation_behavior: string
          expertise_level: string
          id: string
          is_default: boolean
          name: string
          risk_tolerance: string
          system_prompt_patch: string
          tone: string
          updated_at: string
        }
        Insert: {
          ai_lenser_id: string
          autonomy_level?: string
          communication_style?: string
          created_at?: string
          decision_style?: string
          escalation_behavior?: string
          expertise_level?: string
          id?: string
          is_default?: boolean
          name: string
          risk_tolerance?: string
          system_prompt_patch?: string
          tone?: string
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string
          autonomy_level?: string
          communication_style?: string
          created_at?: string
          decision_style?: string
          escalation_behavior?: string
          expertise_level?: string
          id?: string
          is_default?: boolean
          name?: string
          risk_tolerance?: string
          system_prompt_patch?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personality_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personality_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "personality_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      policies: {
        Row: {
          ai_lenser_id: string
          allowed_battle_types: string[]
          allowed_output_modalities: string[]
          can_create_battles: boolean
          can_join_battles: boolean
          can_receive_sponsorship: boolean
          can_vote: boolean
          created_at: string
          id: string
          is_public_policy: boolean
          max_daily_battles: number
          max_daily_votes: number
          model_binding_mode: string
          spending_limit_credits: number
          updated_at: string
        }
        Insert: {
          ai_lenser_id: string
          allowed_battle_types?: string[]
          allowed_output_modalities?: string[]
          can_create_battles?: boolean
          can_join_battles?: boolean
          can_receive_sponsorship?: boolean
          can_vote?: boolean
          created_at?: string
          id?: string
          is_public_policy?: boolean
          max_daily_battles?: number
          max_daily_votes?: number
          model_binding_mode?: string
          spending_limit_credits?: number
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string
          allowed_battle_types?: string[]
          allowed_output_modalities?: string[]
          can_create_battles?: boolean
          can_join_battles?: boolean
          can_receive_sponsorship?: boolean
          can_vote?: boolean
          created_at?: string
          id?: string
          is_public_policy?: boolean
          max_daily_battles?: number
          max_daily_votes?: number
          model_binding_mode?: string
          spending_limit_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "policies_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_evaluations: {
        Row: {
          ai_lenser_id: string
          context: Json
          evaluated_at: string
          evaluation_point: string
          id: string
          policy_type: string
          reason: string | null
          team_run_id: string | null
          tool_invocation_id: string | null
          verdict: string
        }
        Insert: {
          ai_lenser_id: string
          context?: Json
          evaluated_at?: string
          evaluation_point: string
          id?: string
          policy_type: string
          reason?: string | null
          team_run_id?: string | null
          tool_invocation_id?: string | null
          verdict: string
        }
        Update: {
          ai_lenser_id?: string
          context?: Json
          evaluated_at?: string
          evaluation_point?: string
          id?: string
          policy_type?: string
          reason?: string | null
          team_run_id?: string | null
          tool_invocation_id?: string | null
          verdict?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "policy_evaluations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "policy_evaluations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "policy_evaluations_tool_invocation_id_fkey"
            columns: ["tool_invocation_id"]
            isOneToOne: false
            referencedRelation: "tool_invocations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_evaluations_tool_invocation_id_fkey"
            columns: ["tool_invocation_id"]
            isOneToOne: false
            referencedRelation: "tool_invocations_v"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_configs: {
        Row: {
          ai_key_id: string | null
          ai_lenser_id: string
          base_url: string | null
          configured_at: string | null
          created_at: string
          id: string
          last_checked_at: string | null
          provider_key: string
          status: string
          updated_at: string
        }
        Insert: {
          ai_key_id?: string | null
          ai_lenser_id: string
          base_url?: string | null
          configured_at?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          provider_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          ai_key_id?: string | null
          ai_lenser_id?: string
          base_url?: string | null
          configured_at?: string | null
          created_at?: string
          id?: string
          last_checked_at?: string | null
          provider_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "provider_configs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "provider_configs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "provider_configs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      quota_snapshots: {
        Row: {
          ai_lenser_id: string
          battles_used: number
          credits_spent: number
          id: string
          period_date: string
          updated_at: string
          votes_used: number
        }
        Insert: {
          ai_lenser_id: string
          battles_used?: number
          credits_spent?: number
          id?: string
          period_date?: string
          updated_at?: string
          votes_used?: number
        }
        Update: {
          ai_lenser_id?: string
          battles_used?: number
          credits_spent?: number
          id?: string
          period_date?: string
          updated_at?: string
          votes_used?: number
        }
        Relationships: [
          {
            foreignKeyName: "quota_snapshots_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quota_snapshots_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "quota_snapshots_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      run_incidents: {
        Row: {
          ai_lenser_id: string
          context: Json
          created_at: string
          description: string | null
          id: string
          incident_type: string
          resolution: string | null
          resolved_at: string | null
          run_report_id: string
          severity: string
          title: string
        }
        Insert: {
          ai_lenser_id: string
          context?: Json
          created_at?: string
          description?: string | null
          id?: string
          incident_type: string
          resolution?: string | null
          resolved_at?: string | null
          run_report_id: string
          severity: string
          title: string
        }
        Update: {
          ai_lenser_id?: string
          context?: Json
          created_at?: string
          description?: string | null
          id?: string
          incident_type?: string
          resolution?: string | null
          resolved_at?: string | null
          run_report_id?: string
          severity?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "run_incidents_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_incidents_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "run_incidents_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_incidents_run_report_id_fkey"
            columns: ["run_report_id"]
            isOneToOne: false
            referencedRelation: "run_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      run_reports: {
        Row: {
          ai_lenser_id: string
          created_at: string
          evaluation_score: number | null
          id: string
          metrics: Json
          outcome: string
          summary: string | null
          team_run_id: string | null
          title: string
          total_cost_estimate: number
          total_memory_writes: number
          total_steps: number
          total_tool_invocations: number
          workflow_run_id: string | null
        }
        Insert: {
          ai_lenser_id: string
          created_at?: string
          evaluation_score?: number | null
          id?: string
          metrics?: Json
          outcome: string
          summary?: string | null
          team_run_id?: string | null
          title: string
          total_cost_estimate?: number
          total_memory_writes?: number
          total_steps?: number
          total_tool_invocations?: number
          workflow_run_id?: string | null
        }
        Update: {
          ai_lenser_id?: string
          created_at?: string
          evaluation_score?: number | null
          id?: string
          metrics?: Json
          outcome?: string
          summary?: string | null
          team_run_id?: string | null
          title?: string
          total_cost_estimate?: number
          total_memory_writes?: number
          total_steps?: number
          total_tool_invocations?: number
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_reports_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_reports_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "run_reports_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_reports_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "run_reports_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "run_reports_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      scratchpad_runs: {
        Row: {
          actor_lenser_id: string
          ai_lenser_id: string
          completed_at: string | null
          cost_credits: number
          created_at: string
          error: string | null
          id: string
          metadata: Json
          model_id: string | null
          output: string | null
          prompt: string
          started_at: string
          status: string
          tool_calls: Json
        }
        Insert: {
          actor_lenser_id: string
          ai_lenser_id: string
          completed_at?: string | null
          cost_credits?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          model_id?: string | null
          output?: string | null
          prompt: string
          started_at?: string
          status?: string
          tool_calls?: Json
        }
        Update: {
          actor_lenser_id?: string
          ai_lenser_id?: string
          completed_at?: string | null
          cost_credits?: number
          created_at?: string
          error?: string | null
          id?: string
          metadata?: Json
          model_id?: string | null
          output?: string | null
          prompt?: string
          started_at?: string
          status?: string
          tool_calls?: Json
        }
        Relationships: [
          {
            foreignKeyName: "scratchpad_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scratchpad_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "scratchpad_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      standing_approvals: {
        Row: {
          ai_lenser_id: string
          created_at: string
          created_by: string
          expires_at: string | null
          gate_kind: string | null
          id: string
          revoked_at: string | null
          workflow_id: string | null
        }
        Insert: {
          ai_lenser_id: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          gate_kind?: string | null
          id?: string
          revoked_at?: string | null
          workflow_id?: string | null
        }
        Update: {
          ai_lenser_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          gate_kind?: string | null
          id?: string
          revoked_at?: string | null
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "standing_approvals_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standing_approvals_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "standing_approvals_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      team_edges: {
        Row: {
          created_at: string
          edge_type: string
          id: string
          is_blocking: boolean
          metadata: Json
          source_member_id: string
          target_member_id: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          edge_type?: string
          id?: string
          is_blocking?: boolean
          metadata?: Json
          source_member_id: string
          target_member_id: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          edge_type?: string
          id?: string
          is_blocking?: boolean
          metadata?: Json
          source_member_id?: string
          target_member_id?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_edges_source_member_id_fkey"
            columns: ["source_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_edges_target_member_id_fkey"
            columns: ["target_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_edges_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          lane: number
          memory_profile_id: string | null
          model_profile_id: string | null
          personality_profile_id: string | null
          responsibility: string
          role: string
          sort_order: number
          team_id: string
          tool_profile_id: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          lane?: number
          memory_profile_id?: string | null
          model_profile_id?: string | null
          personality_profile_id?: string | null
          responsibility?: string
          role?: string
          sort_order?: number
          team_id: string
          tool_profile_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          lane?: number
          memory_profile_id?: string | null
          model_profile_id?: string | null
          personality_profile_id?: string | null
          responsibility?: string
          role?: string
          sort_order?: number
          team_id?: string
          tool_profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "team_members_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_memory_profile_id_fkey"
            columns: ["memory_profile_id"]
            isOneToOne: false
            referencedRelation: "memory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_model_profile_id_fkey"
            columns: ["model_profile_id"]
            isOneToOne: false
            referencedRelation: "model_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_personality_profile_id_fkey"
            columns: ["personality_profile_id"]
            isOneToOne: false
            referencedRelation: "personality_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_tool_profile_id_fkey"
            columns: ["tool_profile_id"]
            isOneToOne: false
            referencedRelation: "tool_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      team_messages: {
        Row: {
          from_agent_id: string
          id: string
          kind: string
          occurred_at: string
          parent_message_id: string | null
          payload: Json
          team_run_id: string
          to_agent_id: string | null
        }
        Insert: {
          from_agent_id: string
          id?: string
          kind: string
          occurred_at?: string
          parent_message_id?: string | null
          payload?: Json
          team_run_id: string
          to_agent_id?: string | null
        }
        Update: {
          from_agent_id?: string
          id?: string
          kind?: string
          occurred_at?: string
          parent_message_id?: string | null
          payload?: Json
          team_run_id?: string
          to_agent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "team_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "team_messages_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_messages_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      team_runs: {
        Row: {
          ai_lenser_id: string
          approval_status: string
          completed_at: string | null
          created_at: string
          id: string
          metadata: Json
          parent_team_run_id: string | null
          recursion_depth: number
          scratchpad: Json
          shared_scratchpad: Json
          shared_scratchpad_version: number
          started_at: string | null
          status: string
          team_id: string | null
          updated_at: string
          workflow_assignment_id: string | null
          workflow_id: string | null
          workflow_run_id: string | null
        }
        Insert: {
          ai_lenser_id: string
          approval_status?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          parent_team_run_id?: string | null
          recursion_depth?: number
          scratchpad?: Json
          shared_scratchpad?: Json
          shared_scratchpad_version?: number
          started_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          workflow_assignment_id?: string | null
          workflow_id?: string | null
          workflow_run_id?: string | null
        }
        Update: {
          ai_lenser_id?: string
          approval_status?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json
          parent_team_run_id?: string | null
          recursion_depth?: number
          scratchpad?: Json
          shared_scratchpad?: Json
          shared_scratchpad_version?: number
          started_at?: string | null
          status?: string
          team_id?: string | null
          updated_at?: string
          workflow_assignment_id?: string | null
          workflow_id?: string | null
          workflow_run_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_parent_team_run_id_fkey"
            columns: ["parent_team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "team_runs_parent_team_run_id_fkey"
            columns: ["parent_team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_parent_team_run_id_fkey"
            columns: ["parent_team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "team_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_workflow_assignment_id_fkey"
            columns: ["workflow_assignment_id"]
            isOneToOne: false
            referencedRelation: "workflow_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          ai_lenser_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          scratchpad: Json
          status: string
          updated_at: string
        }
        Insert: {
          ai_lenser_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          scratchpad?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          scratchpad?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teams_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "teams_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_assignments: {
        Row: {
          ai_lenser_id: string
          allowed: boolean
          created_at: string
          id: string
          profile_id: string | null
          tool_id: string
        }
        Insert: {
          ai_lenser_id: string
          allowed?: boolean
          created_at?: string
          id?: string
          profile_id?: string | null
          tool_id: string
        }
        Update: {
          ai_lenser_id?: string
          allowed?: boolean
          created_at?: string
          id?: string
          profile_id?: string | null
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "tool_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "tool_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_assignments_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_invocations: {
        Row: {
          agent_run_step_id: string | null
          ai_lenser_id: string
          approval_decided_by: string | null
          approval_reason: string | null
          approval_required: boolean
          approval_status: string
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          error: string | null
          id: string
          input: Json
          output: Json | null
          started_at: string | null
          status: string
          team_run_id: string
          tool_id: string
        }
        Insert: {
          agent_run_step_id?: string | null
          ai_lenser_id: string
          approval_decided_by?: string | null
          approval_reason?: string | null
          approval_required?: boolean
          approval_status?: string
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          started_at?: string | null
          status?: string
          team_run_id: string
          tool_id: string
        }
        Update: {
          agent_run_step_id?: string | null
          ai_lenser_id?: string
          approval_decided_by?: string | null
          approval_reason?: string | null
          approval_required?: boolean
          approval_status?: string
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          error?: string | null
          id?: string
          input?: Json
          output?: Json | null
          started_at?: string | null
          status?: string
          team_run_id?: string
          tool_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_invocations_agent_run_step_id_fkey"
            columns: ["agent_run_step_id"]
            isOneToOne: false
            referencedRelation: "agent_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "tool_invocations_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      tool_profiles: {
        Row: {
          ai_lenser_id: string
          allow_tools: string[]
          created_at: string
          deny_tools: string[]
          id: string
          is_default: boolean
          name: string
          provider_overrides: Json
          requires_approval: boolean
          tool_groups: string[]
          updated_at: string
        }
        Insert: {
          ai_lenser_id: string
          allow_tools?: string[]
          created_at?: string
          deny_tools?: string[]
          id?: string
          is_default?: boolean
          name: string
          provider_overrides?: Json
          requires_approval?: boolean
          tool_groups?: string[]
          updated_at?: string
        }
        Update: {
          ai_lenser_id?: string
          allow_tools?: string[]
          created_at?: string
          deny_tools?: string[]
          id?: string
          is_default?: boolean
          name?: string
          provider_overrides?: Json
          requires_approval?: boolean
          tool_groups?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tool_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "tool_profiles_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      tools_registry: {
        Row: {
          auth_method: string
          category: string
          created_at: string
          description: string | null
          egress_class: string
          id: string
          is_dangerous: boolean
          key: string
          name: string
          owner_lenser_id: string
          requires_approval: boolean
          schema_input: Json
          schema_output: Json
          status: string
          updated_at: string
        }
        Insert: {
          auth_method?: string
          category?: string
          created_at?: string
          description?: string | null
          egress_class?: string
          id?: string
          is_dangerous?: boolean
          key: string
          name: string
          owner_lenser_id: string
          requires_approval?: boolean
          schema_input?: Json
          schema_output?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          auth_method?: string
          category?: string
          created_at?: string
          description?: string | null
          egress_class?: string
          id?: string
          is_dangerous?: boolean
          key?: string
          name?: string
          owner_lenser_id?: string
          requires_approval?: boolean
          schema_input?: Json
          schema_output?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_assignments: {
        Row: {
          ai_lenser_id: string
          approval_policy: Json
          assignee_ai_lenser_id: string | null
          assignee_kind: string
          assignee_team_id: string | null
          created_at: string
          failure_policy: Json
          id: string
          is_active: boolean
          output_destination: Json
          queue_policy: Json
          retry_policy: Json
          updated_at: string
          workflow_id: string
        }
        Insert: {
          ai_lenser_id: string
          approval_policy?: Json
          assignee_ai_lenser_id?: string | null
          assignee_kind?: string
          assignee_team_id?: string | null
          created_at?: string
          failure_policy?: Json
          id?: string
          is_active?: boolean
          output_destination?: Json
          queue_policy?: Json
          retry_policy?: Json
          updated_at?: string
          workflow_id: string
        }
        Update: {
          ai_lenser_id?: string
          approval_policy?: Json
          assignee_ai_lenser_id?: string | null
          assignee_kind?: string
          assignee_team_id?: string | null
          created_at?: string
          failure_policy?: Json
          id?: string
          is_active?: boolean
          output_destination?: Json
          queue_policy?: Json
          retry_policy?: Json
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "workflow_assignments_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_assignments_assignee_ai_lenser_id_fkey"
            columns: ["assignee_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_assignments_assignee_ai_lenser_id_fkey"
            columns: ["assignee_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "workflow_assignments_assignee_ai_lenser_id_fkey"
            columns: ["assignee_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_assignments_assignee_team_id_fkey"
            columns: ["assignee_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          agent_paused: boolean
          ai_lenser_id: string
          api_access_enabled: boolean
          approval_default: string
          budget_enforce: boolean
          created_at: string
          dark_launch_enabled: boolean
          dark_launch_pct: number
          default_model_id: string | null
          default_provider_key: string | null
          global_kill_switch: boolean
          max_daily_credits: number
          max_parallel_runs: number
          metadata: Json
          retention_days: number
          runner_paused: boolean
          updated_at: string
          webhooks: Json
        }
        Insert: {
          agent_paused?: boolean
          ai_lenser_id: string
          api_access_enabled?: boolean
          approval_default?: string
          budget_enforce?: boolean
          created_at?: string
          dark_launch_enabled?: boolean
          dark_launch_pct?: number
          default_model_id?: string | null
          default_provider_key?: string | null
          global_kill_switch?: boolean
          max_daily_credits?: number
          max_parallel_runs?: number
          metadata?: Json
          retention_days?: number
          runner_paused?: boolean
          updated_at?: string
          webhooks?: Json
        }
        Update: {
          agent_paused?: boolean
          ai_lenser_id?: string
          api_access_enabled?: boolean
          approval_default?: string
          budget_enforce?: boolean
          created_at?: string
          dark_launch_enabled?: boolean
          dark_launch_pct?: number
          default_model_id?: string | null
          default_provider_key?: string | null
          global_kill_switch?: boolean
          max_daily_credits?: number
          max_parallel_runs?: number
          metadata?: Json
          retention_days?: number
          runner_paused?: boolean
          updated_at?: string
          webhooks?: Json
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_settings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "workspace_settings_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: true
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_switches: {
        Row: {
          from_ai_lenser_id: string | null
          human_lenser_id: string
          id: string
          switched_at: string
          to_ai_lenser_id: string | null
        }
        Insert: {
          from_ai_lenser_id?: string | null
          human_lenser_id: string
          id?: string
          switched_at?: string
          to_ai_lenser_id?: string | null
        }
        Update: {
          from_ai_lenser_id?: string | null
          human_lenser_id?: string
          id?: string
          switched_at?: string
          to_ai_lenser_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspace_switches_from_ai_lenser_id_fkey"
            columns: ["from_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_switches_from_ai_lenser_id_fkey"
            columns: ["from_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "workspace_switches_from_ai_lenser_id_fkey"
            columns: ["from_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_switches_to_ai_lenser_id_fkey"
            columns: ["to_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_switches_to_ai_lenser_id_fkey"
            columns: ["to_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "workspace_switches_to_ai_lenser_id_fkey"
            columns: ["to_ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      approval_requests_v: {
        Row: {
          ai_lenser_id: string | null
          approval_policy: Json | null
          approval_status: string | null
          assignee_kind: string | null
          completed_at: string | null
          failure_policy: Json | null
          gate_kind: string | null
          metadata: Json | null
          request_id: string | null
          requested_action: string | null
          requested_at: string | null
          requester_agent_id: string | null
          retry_policy: Json | null
          run_status: string | null
          started_at: string | null
          team_id: string | null
          workflow_assignment_id: string | null
          workflow_id: string | null
          workflow_run_id: string | null
          workflow_title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_workflow_assignment_id_fkey"
            columns: ["workflow_assignment_id"]
            isOneToOne: false
            referencedRelation: "workflow_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluation_results_v: {
        Row: {
          case_error: string | null
          case_id: string | null
          case_output: Json | null
          case_score: number | null
          completed_at: string | null
          evaluation_id: string | null
          expected: Json | null
          input: Json | null
          passed: boolean | null
          result_id: string | null
          run_id: string | null
          run_score: number | null
          run_status: string | null
          started_at: string | null
          tags: string[] | null
          weight: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evaluation_runs_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      memories_v: {
        Row: {
          ai_lenser_id: string | null
          confidence: number | null
          content: string | null
          created_at: string | null
          embedding_metadata: Json | null
          expires_at: string | null
          id: string | null
          is_redacted: boolean | null
          profile_id: string | null
          profile_name: string | null
          scope: string | null
          source: string | null
          team_run_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "memories_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "memory_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memories_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
        ]
      }
      tool_invocations_v: {
        Row: {
          agent_run_step_id: string | null
          ai_lenser_id: string | null
          approval_decided_by: string | null
          approval_reason: string | null
          approval_required: boolean | null
          approval_status: string | null
          completed_at: string | null
          cost_estimate: number | null
          created_at: string | null
          egress_class: string | null
          error: string | null
          id: string | null
          input: Json | null
          is_dangerous: boolean | null
          output: Json | null
          started_at: string | null
          status: string | null
          step_title: string | null
          team_run_id: string | null
          tool_category: string | null
          tool_id: string | null
          tool_key: string | null
          tool_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tool_invocations_agent_run_step_id_fkey"
            columns: ["agent_run_step_id"]
            isOneToOne: false
            referencedRelation: "agent_run_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "tool_invocations_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tool_invocations_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "tool_invocations_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      v_agent_profile: {
        Row: {
          ai_lenser_id: string | null
          allowed_battle_types: string[] | null
          avatar_url: string | null
          battles_lost: number | null
          battles_used: number | null
          battles_won: number | null
          can_create_battles: boolean | null
          can_join_battles: boolean | null
          can_receive_sponsorship: boolean | null
          can_vote: boolean | null
          created_at: string | null
          credits_spent: number | null
          display_name: string | null
          handle: string | null
          id: string | null
          is_active: boolean | null
          is_public_policy: boolean | null
          lens_count: number | null
          lenser_type: Database["lensers"]["Enums"]["lenser_type"] | null
          max_daily_battles: number | null
          max_daily_votes: number | null
          model_binding_mode: string | null
          model_count: number | null
          owner_avatar_url: string | null
          owner_display_name: string | null
          owner_handle: string | null
          owner_lenser_id: string | null
          personality_note: string | null
          profile_id: string | null
          runtime_pref: string | null
          spending_limit_credits: number | null
          suspended_at: string | null
          suspended_reason: string | null
          total_battles: number | null
          votes_used: number | null
          win_rate: number | null
        }
        Relationships: []
      }
      v_gateway_device_health: {
        Row: {
          approved_at: string | null
          created_at: string | null
          daemon_version: string | null
          device_id: string | null
          hostname: string | null
          kill_switch: boolean | null
          last_seen_at: string | null
          owner_id: string | null
          pending_commands: number | null
          revoked_at: string | null
          unacked_commands: number | null
        }
        Relationships: []
      }
      v_human_fleet_logs: {
        Row: {
          agent_handle: string | null
          ai_lenser_id: string | null
          event_id: string | null
          event_type: string | null
          human_lenser_id: string | null
          occurred_at: string | null
          payload: Json | null
          team_run_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "approval_requests_v"
            referencedColumns: ["request_id"]
          },
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "team_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_run_events_team_run_id_fkey"
            columns: ["team_run_id"]
            isOneToOne: false
            referencedRelation: "v_human_fleet_runs"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
        ]
      }
      v_human_fleet_overview: {
        Row: {
          agents_active: number | null
          agents_total: number | null
          approvals_pending: number | null
          credits_30d: number | null
          human_lenser_id: string | null
          runs_24h: number | null
          schedules_active: number | null
        }
        Relationships: []
      }
      v_human_fleet_runs: {
        Row: {
          agent_handle: string | null
          ai_lenser_id: string | null
          approval_status: string | null
          completed_at: string | null
          created_at: string | null
          human_lenser_id: string | null
          metadata: Json | null
          run_id: string | null
          started_at: string | null
          status: string | null
          team_id: string | null
          workflow_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "ai_lensers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["ai_lenser_id"]
          },
          {
            foreignKeyName: "team_runs_ai_lenser_id_fkey"
            columns: ["ai_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_agent_profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_runs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      v_run_unified: {
        Row: {
          ai_lenser_id: string | null
          approval_status: string | null
          completed_at: string | null
          duration_seconds: number | null
          latest_evaluation_score: number | null
          memory_write_count: number | null
          run_id: string | null
          run_type: string | null
          started_at: string | null
          status: string | null
          step_count: number | null
          total_cost: number | null
        }
        Relationships: []
      }
      v_team_run_conversation: {
        Row: {
          depth: number | null
          from_agent_id: string | null
          kind: string | null
          message_id: string | null
          occurred_at: string | null
          parent_message_id: string | null
          payload: Json | null
          team_run_id: string | null
          to_agent_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_manage_ai_lenser: {
        Args: { p_ai_lenser_id: string }
        Returns: boolean
      }
      fn_agent_action: {
        Args: {
          p_action_type: string
          p_ai_lenser_id: string
          p_context_id?: string
          p_context_type?: string
          p_metadata?: Json
        }
        Returns: Json
      }
      fn_build_lenser_prompt_context: {
        Args: { p_ai_lenser_id: string; p_limit?: number; p_scope?: string }
        Returns: string
      }
      fn_bulk_approve: { Args: { p_filters?: Json }; Returns: number }
      fn_claim_team_run: {
        Args: { p_worker_id?: string }
        Returns: {
          ai_lenser_id: string
          id: string
          metadata: Json
          workflow_id: string
          workflow_run_id: string
        }[]
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
        Returns: {
          acked_at: string | null
          claimed_at: string | null
          command_type: string
          created_at: string
          device_id: string
          envelope_nonce: string | null
          envelope_sig: string | null
          id: string
          payload: Json
        }[]
        SetofOptions: {
          from: "*"
          to: "gateway_commands"
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
      fn_get_agent_effective_provider: {
        Args: { p_ai_lenser_id: string }
        Returns: string
      }
      fn_get_team_member_role: {
        Args: { p_agent_id: string; p_team_run_id: string }
        Returns: string
      }
      fn_has_standing_approval: {
        Args: {
          p_ai_lenser_id: string
          p_gate_kind: string
          p_workflow_id: string
        }
        Returns: boolean
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
      fn_merge_shared_scratchpad: {
        Args: {
          p_expected_version: number
          p_patch: Json
          p_team_run_id: string
        }
        Returns: Json
      }
      fn_node_requires_review: {
        Args: { p_team_run_id: string }
        Returns: boolean
      }
      fn_purge_stale_blocked_team_runs: {
        Args: { p_max_age?: string }
        Returns: number
      }
      fn_send_team_message: {
        Args: {
          p_from_agent_id: string
          p_kind: string
          p_parent_id?: string
          p_payload?: Json
          p_team_run_id: string
          p_to_agent_id?: string
        }
        Returns: string
      }
      fn_start_team_run: {
        Args: {
          p_ai_lenser_id: string
          p_inputs?: Json
          p_policy?: string
          p_workflow_id: string
        }
        Returns: string
      }
      fn_trigger_post_run_evaluations: {
        Args: { p_team_run_id: string; p_workflow_id: string }
        Returns: undefined
      }
      fn_update_agent_policy: {
        Args: { p_ai_lenser_id: string; p_updates: Json }
        Returns: Json
      }
      has_agent_scope: {
        Args: { p_ai_lenser_id: string; p_scope: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ai: {
    Tables: {
      key_usage_log: {
        Row: {
          created_at: string
          credit_cost: number | null
          id: string
          key_id: string
          lenser_id: string
          model_key: string | null
          provider: string | null
          run_id: string | null
          token_input: number | null
          token_output: number | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          credit_cost?: number | null
          id?: string
          key_id: string
          lenser_id: string
          model_key?: string | null
          provider?: string | null
          run_id?: string | null
          token_input?: number | null
          token_output?: number | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          credit_cost?: number | null
          id?: string
          key_id?: string
          lenser_id?: string
          model_key?: string | null
          provider?: string | null
          run_id?: string | null
          token_input?: number | null
          token_output?: number | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "key_usage_log_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "keys"
            referencedColumns: ["id"]
          },
        ]
      }
      keys: {
        Row: {
          created_at: string
          encrypted_key_id: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_prefix: string | null
          key_suffix: string
          label: string | null
          last_used_at: string | null
          lenser_id: string
          provider_id: string
          revoked_at: string | null
          scope: Database["ai"]["Enums"]["key_scope_enum"] | null
          scoped_entity_id: string | null
          status: Database["ai"]["Enums"]["key_status_enum"] | null
        }
        Insert: {
          created_at?: string
          encrypted_key_id: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_prefix?: string | null
          key_suffix: string
          label?: string | null
          last_used_at?: string | null
          lenser_id: string
          provider_id: string
          revoked_at?: string | null
          scope?: Database["ai"]["Enums"]["key_scope_enum"] | null
          scoped_entity_id?: string | null
          status?: Database["ai"]["Enums"]["key_status_enum"] | null
        }
        Update: {
          created_at?: string
          encrypted_key_id?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_prefix?: string | null
          key_suffix?: string
          label?: string | null
          last_used_at?: string | null
          lenser_id?: string
          provider_id?: string
          revoked_at?: string | null
          scope?: Database["ai"]["Enums"]["key_scope_enum"] | null
          scoped_entity_id?: string | null
          status?: Database["ai"]["Enums"]["key_status_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "keys_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      modality_pricing: {
        Row: {
          credit_rate: number
          id: string
          is_active: boolean
          model_id: string
          output_modality: string
          rate_unit: string
          updated_at: string
        }
        Insert: {
          credit_rate: number
          id?: string
          is_active?: boolean
          model_id: string
          output_modality: string
          rate_unit: string
          updated_at?: string
        }
        Update: {
          credit_rate?: number
          id?: string
          is_active?: boolean
          model_id?: string
          output_modality?: string
          rate_unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modality_pricing_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          input_cost_per_1k_tokens: number
          model_id: string
          output_cost_per_1k_tokens: number
          unit_type: Database["ai"]["Enums"]["unit_type_enum"]
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          input_cost_per_1k_tokens: number
          model_id: string
          output_cost_per_1k_tokens: number
          unit_type?: Database["ai"]["Enums"]["unit_type_enum"]
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          input_cost_per_1k_tokens?: number
          model_id?: string
          output_cost_per_1k_tokens?: number
          unit_type?: Database["ai"]["Enums"]["unit_type_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "model_pricing_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "models"
            referencedColumns: ["id"]
          },
        ]
      }
      models: {
        Row: {
          capabilities: string[]
          context_window_tokens: number | null
          created_at: string
          description: string
          developer_summary: string
          docs_url: string | null
          id: string
          input_modalities: string[]
          is_active: boolean
          key: string | null
          max_tokens: number
          metadata: Json
          name: string
          output_modalities: string[]
          provider_id: string
          provider_url: string | null
          status: string
          support_level: string
          supports_json_schema: boolean
          supports_streaming: boolean
          supports_tools: boolean
          supports_vision: boolean
          temperature: number
          use_cases: string[]
          user_summary: string
          version: string | null
        }
        Insert: {
          capabilities?: string[]
          context_window_tokens?: number | null
          created_at?: string
          description?: string
          developer_summary?: string
          docs_url?: string | null
          id?: string
          input_modalities?: string[]
          is_active?: boolean
          key?: string | null
          max_tokens?: number
          metadata?: Json
          name: string
          output_modalities?: string[]
          provider_id: string
          provider_url?: string | null
          status?: string
          support_level?: string
          supports_json_schema?: boolean
          supports_streaming?: boolean
          supports_tools?: boolean
          supports_vision?: boolean
          temperature?: number
          use_cases?: string[]
          user_summary?: string
          version?: string | null
        }
        Update: {
          capabilities?: string[]
          context_window_tokens?: number | null
          created_at?: string
          description?: string
          developer_summary?: string
          docs_url?: string | null
          id?: string
          input_modalities?: string[]
          is_active?: boolean
          key?: string | null
          max_tokens?: number
          metadata?: Json
          name?: string
          output_modalities?: string[]
          provider_id?: string
          provider_url?: string | null
          status?: string
          support_level?: string
          supports_json_schema?: boolean
          supports_streaming?: boolean
          supports_tools?: boolean
          supports_vision?: boolean
          temperature?: number
          use_cases?: string[]
          user_summary?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "models_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          base_url: string | null
          created_at: string
          display_name: string
          docs_url: string | null
          id: string
          is_active: boolean
          key: string
          logo_slug: string | null
          metadata: Json
          support_level: string
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          created_at?: string
          display_name: string
          docs_url?: string | null
          id?: string
          is_active?: boolean
          key: string
          logo_slug?: string | null
          metadata?: Json
          support_level?: string
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          created_at?: string
          display_name?: string
          docs_url?: string | null
          id?: string
          is_active?: boolean
          key?: string
          logo_slug?: string | null
          metadata?: Json
          support_level?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      fn_decrypt_api_key: { Args: { p_key_id: string }; Returns: string }
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
      fn_get_my_api_keys_paged: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json[]
      }
      fn_revoke_api_key: { Args: { p_key_id: string }; Returns: undefined }
      fn_store_api_key: {
        Args: { p_label?: string; p_provider: string; p_raw_key?: string }
        Returns: string
      }
    }
    Enums: {
      ai_capability_enum: "text" | "image" | "code" | "music"
      key_scope_enum: "agent" | "user" | "team"
      key_status_enum: "active" | "revoked" | "expired"
      media_type:
        | "text"
        | "image"
        | "audio"
        | "video"
        | "document"
        | "json"
        | "binary"
      model_tier_enum: "free" | "paid" | "enterprise"
      provider_enum:
        | "openai"
        | "anthropic"
        | "google"
        | "custom"
        | "xai"
        | "meta"
        | "mistral"
        | "local"
      resource_type: "attachment" | "dataset" | "example" | "reference"
      unit_type_enum: "tokens" | "image" | "video_second" | "audio_second"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  content: {
    Tables: {
      entity_translations: {
        Row: {
          content: string | null
          created_at: string
          description: string | null
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id: string
          is_original: boolean
          language_code: string
          title: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          description?: string | null
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          is_original?: boolean
          language_code: string
          title?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string
          entity_type?: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          is_original?: boolean
          language_code?: string
          title?: string | null
        }
        Relationships: []
      }
      reactions: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id: string
          lenser_id: string
          reaction: Database["content"]["Enums"]["reaction_enum"]
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          lenser_id: string
          reaction: Database["content"]["Enums"]["reaction_enum"]
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          lenser_id?: string
          reaction?: Database["content"]["Enums"]["reaction_enum"]
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: Database["content"]["Enums"]["report_reason_enum"]
          reporter_id: string
          target_id: string
          target_type: Database["content"]["Enums"]["entity_type_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: Database["content"]["Enums"]["report_reason_enum"]
          reporter_id: string
          target_id: string
          target_type: Database["content"]["Enums"]["entity_type_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: Database["content"]["Enums"]["report_reason_enum"]
          reporter_id?: string
          target_id?: string
          target_type?: Database["content"]["Enums"]["entity_type_enum"]
        }
        Relationships: []
      }
      tag_map: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          tag_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_suggestions: {
        Row: {
          ai_model_id: string | null
          confidence_score: number
          created_at: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id: string
          status: Database["content"]["Enums"]["suggestion_status_enum"] | null
          tag_id: string
        }
        Insert: {
          ai_model_id?: string | null
          confidence_score: number
          created_at?: string
          entity_id: string
          entity_type: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          status?: Database["content"]["Enums"]["suggestion_status_enum"] | null
          tag_id: string
        }
        Update: {
          ai_model_id?: string | null
          confidence_score?: number
          created_at?: string
          entity_id?: string
          entity_type?: Database["content"]["Enums"]["entity_type_enum"]
          id?: string
          status?: Database["content"]["Enums"]["suggestion_status_enum"] | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_suggestions_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          created_at: string
          id: string
          language_code: string
          name: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language_code: string
          name: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language_code?: string
          name?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          id: string
          slug: string
          visibility: Database["content"]["Enums"]["tag_visibility_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          slug: string
          visibility?: Database["content"]["Enums"]["tag_visibility_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          slug?: string
          visibility?: Database["content"]["Enums"]["tag_visibility_enum"]
        }
        Relationships: []
      }
      thread_replies: {
        Row: {
          content: string
          content_html: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          lenser_id: string
          parent_reply_id: string | null
          status: Database["content"]["Enums"]["thread_reply_status"]
          thread_id: string
          updated_at: string | null
        }
        Insert: {
          content: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lenser_id?: string
          parent_reply_id?: string | null
          status?: Database["content"]["Enums"]["thread_reply_status"]
          thread_id: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_html?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          lenser_id?: string
          parent_reply_id?: string | null
          status?: Database["content"]["Enums"]["thread_reply_status"]
          thread_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "thread_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "thread_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "vw_threads_hot_scores"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          created_at: string
          id: string
          lens_data: Json | null
          lenser_id: string
          linked_lens_id: string | null
          reply_count: number
          status: Database["content"]["Enums"]["content_status"]
          thumbnail_url: string | null
          updated_at: string
          view_count: number
          visibility: Database["content"]["Enums"]["visibility_enum"]
        }
        Insert: {
          created_at?: string
          id?: string
          lens_data?: Json | null
          lenser_id?: string
          linked_lens_id?: string | null
          reply_count?: number
          status?: Database["content"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["content"]["Enums"]["visibility_enum"]
        }
        Update: {
          created_at?: string
          id?: string
          lens_data?: Json | null
          lenser_id?: string
          linked_lens_id?: string | null
          reply_count?: number
          status?: Database["content"]["Enums"]["content_status"]
          thumbnail_url?: string | null
          updated_at?: string
          view_count?: number
          visibility?: Database["content"]["Enums"]["visibility_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "threads_linked_lens_id_fkey"
            columns: ["linked_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_auth_lenses: {
        Row: {
          author_profile: Json | null
          content: string | null
          created_at: string | null
          description: string | null
          id: string | null
          language_code: string | null
          lenser_id: string | null
          reaction_totals: Json | null
          status: Database["content"]["Enums"]["content_status"] | null
          title: string | null
          updated_at: string | null
          visibility: Database["content"]["Enums"]["visibility_enum"] | null
        }
        Relationships: []
      }
      vw_auth_threads: {
        Row: {
          author_profile: Json | null
          content: string | null
          created_at: string | null
          id: string | null
          language_code: string | null
          lens_data: Json | null
          lenser_id: string | null
          reaction_totals: Json | null
          reply_count: number | null
          status: Database["content"]["Enums"]["content_status"] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          view_count: number | null
          visibility: Database["content"]["Enums"]["visibility_enum"] | null
        }
        Relationships: []
      }
      vw_tag_cross_lang: {
        Row: {
          equivalent_tag_id: string | null
          source_tag_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["equivalent_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["source_tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_threads_hot_scores: {
        Row: {
          hot_score: number | null
          id: string | null
          primary_language: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_cleanup_entity_refs: {
        Args: {
          p_entity_id: string
          p_entity_type: Database["content"]["Enums"]["entity_type_enum"]
        }
        Returns: undefined
      }
      thread_reply_counts_as_public: {
        Args: { r: Database["content"]["Tables"]["thread_replies"]["Row"] }
        Returns: boolean
      }
      toggle_reaction: {
        Args: {
          p_lenser_id: string
          p_reaction: Database["content"]["Enums"]["reaction_enum"]
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      user_owns_lens: { Args: { template_id: string }; Returns: boolean }
      user_owns_thread: { Args: { thread_id: string }; Returns: boolean }
    }
    Enums: {
      content_status: "draft" | "published" | "archived"
      entity_type_enum:
        | "thread"
        | "lens"
        | "battle"
        | "thread_reply"
        | "workflow"
      payment_method_enum: "byok" | "wallet" | "free"
      reaction_enum: "like" | "dislike" | "saved" | "copy" | "love" | "clap"
      report_reason_enum:
        | "spam"
        | "harassment"
        | "misinformation"
        | "off_topic"
        | "other"
      suggestion_status_enum: "pending" | "accepted" | "rejected"
      tag_visibility_enum: "public" | "private" | "hidden"
      thread_reply_status: "published" | "hidden" | "deleted"
      thread_visibility: "public" | "community" | "private"
      visibility_enum: "public" | "community" | "private"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  execution: {
    Tables: {
      artifact_medias: {
        Row: {
          artifact_id: string
          created_at: string
          id: string
          media_id: string
        }
        Insert: {
          artifact_id: string
          created_at?: string
          id?: string
          media_id: string
        }
        Update: {
          artifact_id?: string
          created_at?: string
          id?: string
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_medias_artifact_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          artifact_kind: string
          content_json: Json | null
          content_text: string | null
          created_at: string
          id: string
          is_primary_output: boolean
          output_type: string | null
          run_id: string
          visibility: string
        }
        Insert: {
          artifact_kind: string
          content_json?: Json | null
          content_text?: string | null
          created_at?: string
          id?: string
          is_primary_output?: boolean
          output_type?: string | null
          run_id: string
          visibility?: string
        }
        Update: {
          artifact_kind?: string
          content_json?: Json | null
          content_text?: string | null
          created_at?: string
          id?: string
          is_primary_output?: boolean
          output_type?: string | null
          run_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifacts_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      attestation_verifications: {
        Row: {
          attestation_id: string
          device_id: string | null
          envelope_hash: string | null
          envelope_iat: string | null
          envelope_kid: string | null
          envelope_nonce: string | null
          invalid_reason: string | null
          verified: boolean
          verified_at: string
        }
        Insert: {
          attestation_id: string
          device_id?: string | null
          envelope_hash?: string | null
          envelope_iat?: string | null
          envelope_kid?: string | null
          envelope_nonce?: string | null
          invalid_reason?: string | null
          verified?: boolean
          verified_at?: string
        }
        Update: {
          attestation_id?: string
          device_id?: string | null
          envelope_hash?: string | null
          envelope_iat?: string | null
          envelope_kid?: string | null
          envelope_nonce?: string | null
          invalid_reason?: string | null
          verified?: boolean
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attestation_verifications_attestation_id_fkey"
            columns: ["attestation_id"]
            isOneToOne: true
            referencedRelation: "attestations"
            referencedColumns: ["id"]
          },
        ]
      }
      attestations: {
        Row: {
          agent_config_hash: string | null
          cli_version: string | null
          created_at: string
          device_id: string | null
          device_trusted: boolean
          envelope_body_jcs_sha256: string | null
          envelope_iat: string | null
          envelope_kid: string | null
          envelope_nonce: string | null
          gateway_verified: boolean
          id: string
          lens_hash: string | null
          policy_passed: boolean
          run_id: string
          runner_version: string | null
          signature: string | null
          signed: boolean
          workflow_hash: string | null
        }
        Insert: {
          agent_config_hash?: string | null
          cli_version?: string | null
          created_at?: string
          device_id?: string | null
          device_trusted?: boolean
          envelope_body_jcs_sha256?: string | null
          envelope_iat?: string | null
          envelope_kid?: string | null
          envelope_nonce?: string | null
          gateway_verified?: boolean
          id?: string
          lens_hash?: string | null
          policy_passed?: boolean
          run_id: string
          runner_version?: string | null
          signature?: string | null
          signed?: boolean
          workflow_hash?: string | null
        }
        Update: {
          agent_config_hash?: string | null
          cli_version?: string | null
          created_at?: string
          device_id?: string | null
          device_trusted?: boolean
          envelope_body_jcs_sha256?: string | null
          envelope_iat?: string | null
          envelope_kid?: string | null
          envelope_nonce?: string | null
          gateway_verified?: boolean
          id?: string
          lens_hash?: string | null
          policy_passed?: boolean
          run_id?: string
          runner_version?: string | null
          signature?: string | null
          signed?: boolean
          workflow_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attestations_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      byok_keys: {
        Row: {
          agent_id: string
          allowed_model_ids: string[] | null
          created_at: string
          expires_at: string | null
          id: string
          key_encrypted: string
          key_hint: string | null
          label: string | null
          last_rotated_at: string | null
          provider: string
          revoked_at: string | null
        }
        Insert: {
          agent_id: string
          allowed_model_ids?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_encrypted: string
          key_hint?: string | null
          label?: string | null
          last_rotated_at?: string | null
          provider: string
          revoked_at?: string | null
        }
        Update: {
          agent_id?: string
          allowed_model_ids?: string[] | null
          created_at?: string
          expires_at?: string | null
          id?: string
          key_encrypted?: string
          key_hint?: string | null
          label?: string | null
          last_rotated_at?: string | null
          provider?: string
          revoked_at?: string | null
        }
        Relationships: []
      }
      execution_tags: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          run_id: string
          severity: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          run_id: string
          severity?: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          run_id?: string
          severity?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "execution_tags_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      links: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          run_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          run_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "links_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      origin_types: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          key: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
        }
        Relationships: []
      }
      parameter_usage_logs: {
        Row: {
          ai_model_id: string | null
          created_at: string
          id: string
          lenser_id: string
          metadata: Json | null
          parameter_key: string
          parameter_type: string
          request_id: string
          value_snapshot: string | null
          version_id: string | null
          version_parameter_id: string | null
          was_empty: boolean
          was_required: boolean
          workspace_id: string
        }
        Insert: {
          ai_model_id?: string | null
          created_at?: string
          id?: string
          lenser_id: string
          metadata?: Json | null
          parameter_key: string
          parameter_type: string
          request_id: string
          value_snapshot?: string | null
          version_id?: string | null
          version_parameter_id?: string | null
          was_empty?: boolean
          was_required?: boolean
          workspace_id: string
        }
        Update: {
          ai_model_id?: string | null
          created_at?: string
          id?: string
          lenser_id?: string
          metadata?: Json | null
          parameter_key?: string
          parameter_type?: string
          request_id?: string
          value_snapshot?: string | null
          version_id?: string | null
          version_parameter_id?: string | null
          was_empty?: boolean
          was_required?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parameter_usage_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          attached_at: string
          binding_key: string
          id: string
          media_object_id: string
          request_id: string
        }
        Insert: {
          attached_at?: string
          binding_key: string
          id?: string
          media_object_id: string
          request_id: string
        }
        Update: {
          attached_at?: string
          binding_key?: string
          id?: string
          media_object_id?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          byok_key_ref_id: string | null
          created_at: string
          funding_source: string
          id: string
          idempotency_key: string | null
          input_snapshot: Json
          is_active: boolean
          lens_id: string | null
          model_id: string | null
          origin_id: string | null
          origin_type: string
          output_modality: string | null
          requester_lenser_id: string
          runtime_origin: string
          version_id: string | null
          workspace_id: string | null
        }
        Insert: {
          byok_key_ref_id?: string | null
          created_at?: string
          funding_source?: string
          id?: string
          idempotency_key?: string | null
          input_snapshot?: Json
          is_active?: boolean
          lens_id?: string | null
          model_id?: string | null
          origin_id?: string | null
          origin_type: string
          output_modality?: string | null
          requester_lenser_id: string
          runtime_origin?: string
          version_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          byok_key_ref_id?: string | null
          created_at?: string
          funding_source?: string
          id?: string
          idempotency_key?: string | null
          input_snapshot?: Json
          is_active?: boolean
          lens_id?: string | null
          model_id?: string | null
          origin_id?: string | null
          origin_type?: string
          output_modality?: string | null
          requester_lenser_id?: string
          runtime_origin?: string
          version_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_origin_type_fkey"
            columns: ["origin_type"]
            isOneToOne: false
            referencedRelation: "origin_types"
            referencedColumns: ["key"]
          },
        ]
      }
      runner_device_bindings: {
        Row: {
          bound_at: string
          device_id: string
          id: string
          runner_id: string
          status: string
        }
        Insert: {
          bound_at?: string
          device_id: string
          id?: string
          runner_id: string
          status?: string
        }
        Update: {
          bound_at?: string
          device_id?: string
          id?: string
          runner_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_device_bindings_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      runners: {
        Row: {
          adapter_type: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          last_probe_status: string | null
          last_probed_at: string | null
          lenser_id: string
          name: string
          updated_at: string
        }
        Insert: {
          adapter_type: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_probe_status?: string | null
          last_probed_at?: string | null
          lenser_id: string
          name: string
          updated_at?: string
        }
        Update: {
          adapter_type?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          last_probe_status?: string | null
          last_probed_at?: string | null
          lenser_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      runs: {
        Row: {
          billing_status: string
          completed_at: string | null
          cost_estimate: number | null
          created_at: string
          credit_cost: number | null
          error_code: string | null
          error_message: string | null
          execution_hash: string | null
          id: string
          injected_delay_ms: number
          input_hash: string | null
          is_active: boolean
          is_async: boolean
          last_polled_at: string | null
          latency_ms: number | null
          model_id: string | null
          output_hash: string | null
          provider_request_id: string | null
          provider_task_id: string | null
          request_id: string
          response_meta: Json | null
          response_text: string | null
          started_at: string | null
          status: string
          throttle_applied: boolean
          token_input: number | null
          token_output: number | null
        }
        Insert: {
          billing_status?: string
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          credit_cost?: number | null
          error_code?: string | null
          error_message?: string | null
          execution_hash?: string | null
          id?: string
          injected_delay_ms?: number
          input_hash?: string | null
          is_active?: boolean
          is_async?: boolean
          last_polled_at?: string | null
          latency_ms?: number | null
          model_id?: string | null
          output_hash?: string | null
          provider_request_id?: string | null
          provider_task_id?: string | null
          request_id: string
          response_meta?: Json | null
          response_text?: string | null
          started_at?: string | null
          status?: string
          throttle_applied?: boolean
          token_input?: number | null
          token_output?: number | null
        }
        Update: {
          billing_status?: string
          completed_at?: string | null
          cost_estimate?: number | null
          created_at?: string
          credit_cost?: number | null
          error_code?: string | null
          error_message?: string | null
          execution_hash?: string | null
          id?: string
          injected_delay_ms?: number
          input_hash?: string | null
          is_active?: boolean
          is_async?: boolean
          last_polled_at?: string | null
          latency_ms?: number | null
          model_id?: string | null
          output_hash?: string | null
          provider_request_id?: string | null
          provider_task_id?: string | null
          request_id?: string
          response_meta?: Json | null
          response_text?: string | null
          started_at?: string | null
          status?: string
          throttle_applied?: boolean
          token_input?: number | null
          token_output?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "runs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      steps: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          input_hash: string | null
          input_snapshot: Json | null
          latency_ms: number | null
          ordinal: number
          output_hash: string | null
          output_snapshot: Json | null
          run_id: string
          started_at: string | null
          status: string
          step_definition_id: string | null
          step_type: string
          tool_name: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          input_snapshot?: Json | null
          latency_ms?: number | null
          ordinal: number
          output_hash?: string | null
          output_snapshot?: Json | null
          run_id: string
          started_at?: string | null
          status?: string
          step_definition_id?: string | null
          step_type: string
          tool_name?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          input_snapshot?: Json | null
          latency_ms?: number | null
          ordinal?: number
          output_hash?: string | null
          output_snapshot?: Json | null
          run_id?: string
          started_at?: string | null
          status?: string
          step_definition_id?: string | null
          step_type?: string
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "steps_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "runs"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_sessions: {
        Row: {
          bytes_sent: number
          completed_at: string | null
          credit_cost: number | null
          error_code: string | null
          id: string
          lenser_id: string
          model_key: string
          provider: string
          run_id: string
          started_at: string
          status: string
          token_input: number | null
          token_output: number | null
          workspace_id: string | null
        }
        Insert: {
          bytes_sent?: number
          completed_at?: string | null
          credit_cost?: number | null
          error_code?: string | null
          id?: string
          lenser_id: string
          model_key: string
          provider: string
          run_id: string
          started_at?: string
          status?: string
          token_input?: number | null
          token_output?: number | null
          workspace_id?: string | null
        }
        Update: {
          bytes_sent?: number
          completed_at?: string | null
          credit_cost?: number | null
          error_code?: string | null
          id?: string
          lenser_id?: string
          model_key?: string
          provider?: string
          run_id?: string
          started_at?: string
          status?: string
          token_input?: number | null
          token_output?: number | null
          workspace_id?: string | null
        }
        Relationships: []
      }
      trust_evaluations: {
        Row: {
          attestation_id: string | null
          evaluated_at: string
          factors: Json
          id: string
          submission_id: string
          trust_level: string
        }
        Insert: {
          attestation_id?: string | null
          evaluated_at?: string
          factors?: Json
          id?: string
          submission_id: string
          trust_level?: string
        }
        Update: {
          attestation_id?: string | null
          evaluated_at?: string
          factors?: Json
          id?: string
          submission_id?: string
          trust_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_evaluations_attestation_id_fkey"
            columns: ["attestation_id"]
            isOneToOne: false
            referencedRelation: "attestations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_workflow_run_timeline: {
        Row: {
          error_message: string | null
          event_type: string | null
          node_id: string | null
          occurred_at: string | null
          output_data: Json | null
          run_id: string | null
          status: string | null
          workflow_id: string | null
          workflow_node_result_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      fn_async_run_idempotent_complete: {
        Args: {
          p_bytes?: number
          p_duration_s?: number
          p_height?: number
          p_media_url: string
          p_mime_type: string
          p_run_id: string
          p_width?: number
        }
        Returns: boolean
      }
      fn_b64url_decode: { Args: { p_in: string }; Returns: string }
      fn_claim_queued_run: {
        Args: never
        Returns: {
          byok_key_ref_id: string
          funding_source: string
          input_snapshot: Json
          lens_id: string
          model_id: string
          model_key: string
          provider_key: string
          request_id: string
          requester_lenser_id: string
          run_id: string
          version_id: string
          workspace_id: string
        }[]
      }
      fn_complete_async_run: {
        Args: {
          p_bytes?: number
          p_duration_s?: number
          p_height?: number
          p_media_url: string
          p_mime_type: string
          p_run_id: string
          p_width?: number
        }
        Returns: undefined
      }
      fn_complete_execution_run: {
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
      fn_compute_submission_trust: {
        Args: { p_submission_id: string }
        Returns: string
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
      fn_get_submission_trust: {
        Args: { p_submission_id: string }
        Returns: {
          attestation_id: string
          evaluated_at: string
          factors: Json
          submission_id: string
          trust_level: string
        }[]
      }
      fn_media_finalize_sync_upload: {
        Args: {
          p_bytes?: number
          p_duration_s?: number
          p_height?: number
          p_mime_type: string
          p_object_key: string
          p_run_id: string
          p_width?: number
        }
        Returns: string
      }
      fn_persist_execution_artifacts: {
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
        Returns: string
      }
      fn_persist_local_execution: {
        Args: {
          p_content_text?: string
          p_lens_id: string
          p_model?: string
          p_provider?: string
          p_token_input?: number
          p_token_output?: number
          p_version_id?: string
        }
        Returns: string
      }
      fn_poll_async_run: {
        Args: { p_limit?: number; p_stale_after_seconds?: number }
        Returns: {
          model_key: string
          output_modality: string
          provider_key: string
          provider_task_id: string
          run_id: string
          started_at: string
        }[]
      }
      fn_record_execution_attestation: {
        Args: {
          p_agent_config_hash?: string
          p_cli_version?: string
          p_device_id?: string
          p_device_trusted?: boolean
          p_gateway_verified?: boolean
          p_lens_hash?: string
          p_policy_passed?: boolean
          p_run_id: string
          p_runner_version?: string
          p_signature?: string
          p_signed?: boolean
          p_workflow_hash?: string
        }
        Returns: string
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
      fn_run_lens:
        | {
            Args: {
              p_byok_key_id?: string
              p_funding_source?: string
              p_inputs?: Json
              p_lens_id: string
              p_model_id: string
              p_version_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_byok_key_id?: string
              p_funding_source?: string
              p_inputs?: Json
              p_lens_id: string
              p_model_id: string
              p_version_id: string
              p_workspace_id?: string
            }
            Returns: string
          }
      fn_run_lens_api: {
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
      fn_runner_list_with_devices: {
        Args: { p_cursor?: string; p_limit?: number }
        Returns: {
          binding_status: string
          bound_at: string
          device_id: string
          device_name: string
          runner_id: string
          trust_level: string
        }[]
      }
      fn_set_artifact_visibility: {
        Args: { p_artifact_id: string; p_visibility: string }
        Returns: undefined
      }
      fn_start_execution: {
        Args: {
          p_byok_key_ref_id?: string
          p_funding_source: string
          p_input_snapshot?: Json
          p_lens_id?: string
          p_lenser_id: string
          p_model_id?: string
          p_origin_type: string
          p_workspace_id?: string
        }
        Returns: {
          request_id: string
          run_id: string
        }[]
      }
      fn_timeout_stale_runs: { Args: never; Returns: number }
      fn_verify_attestation_signature: {
        Args: { p_canonical_jcs: string; p_kid: string; p_signature: string }
        Returns: {
          invalid_reason: string
          verified: boolean
        }[]
      }
      fn_xp_apply_safe: {
        Args: {
          p_app_id: string
          p_lenser_id: string
          p_rule_key: string
          p_source:
            | "system"
            | "ai"
            | "battle"
            | "challenge"
            | "daily"
            | "referral"
            | "social"
            | "content"
            | "other"
            | "contribution"
          p_source_ref_id: string
          p_source_ref_type: string
        }
        Returns: undefined
      }
      insert_stream_run: {
        Args: {
          p_bytes_sent?: number
          p_credit_cost: number
          p_error_code?: string
          p_input_snapshot: Json
          p_lenser_id: string
          p_model_id: string
          p_model_key: string
          p_provider_key: string
          p_run_id: string
          p_status: string
          p_token_input: number
          p_token_output: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  lensers: {
    Tables: {
      badges: {
        Row: {
          awarded_at: string
          category: Database["lensers"]["Enums"]["lenser_badge_category"]
          description: string | null
          icon: string | null
          id: string
          label: string
          lenser_id: string
          type: Database["lensers"]["Enums"]["lenser_badge_type"]
          xp_event_id: string | null
        }
        Insert: {
          awarded_at?: string
          category?: Database["lensers"]["Enums"]["lenser_badge_category"]
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          lenser_id: string
          type: Database["lensers"]["Enums"]["lenser_badge_type"]
          xp_event_id?: string | null
        }
        Update: {
          awarded_at?: string
          category?: Database["lensers"]["Enums"]["lenser_badge_category"]
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          lenser_id?: string
          type?: Database["lensers"]["Enums"]["lenser_badge_type"]
          xp_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lenser_badges_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenser_badges_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenser_badges_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          lenser_id: string
          permissions: Json | null
          role: Database["lensers"]["Enums"]["group_member_role_enum"]
        }
        Insert: {
          group_id: string
          joined_at?: string
          lenser_id: string
          permissions?: Json | null
          role?: Database["lensers"]["Enums"]["group_member_role_enum"]
        }
        Update: {
          group_id?: string
          joined_at?: string
          lenser_id?: string
          permissions?: Json | null
          role?: Database["lensers"]["Enums"]["group_member_role_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_lenser_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_lenser_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_lenser_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      groups: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          max_members: number | null
          name: string
          owner_lenser_id: string
          slug: string
          type: Database["lensers"]["Enums"]["group_type_enum"]
          updated_at: string
          visibility: Database["lensers"]["Enums"]["group_visibility_enum"]
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number | null
          name: string
          owner_lenser_id: string
          slug: string
          type?: Database["lensers"]["Enums"]["group_type_enum"]
          updated_at?: string
          visibility?: Database["lensers"]["Enums"]["group_visibility_enum"]
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          max_members?: number | null
          name?: string
          owner_lenser_id?: string
          slug?: string
          type?: Database["lensers"]["Enums"]["group_type_enum"]
          updated_at?: string
          visibility?: Database["lensers"]["Enums"]["group_visibility_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "groups_owner_fkey"
            columns: ["owner_lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_owner_fkey"
            columns: ["owner_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "groups_owner_fkey"
            columns: ["owner_lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      preferences: {
        Row: {
          active_lenser_id: string | null
          ai_data_usage: boolean
          ai_model_key: string | null
          ai_persona: string | null
          ai_provider_key: string | null
          ai_ruleset: Json
          content_visibility: string
          country_id: string | null
          created_at: string
          cron_config: Json
          currency: string | null
          email_digest: boolean
          hide_actions: boolean
          id: string
          language: string
          lenser_id: string
          notifications: Json
          selected_api_key_id: string | null
          sidebar: Json
          theme: string
          updated_at: string
          wallet_mode: Database["lensers"]["Enums"]["wallet_mode_enum"]
        }
        Insert: {
          active_lenser_id?: string | null
          ai_data_usage?: boolean
          ai_model_key?: string | null
          ai_persona?: string | null
          ai_provider_key?: string | null
          ai_ruleset?: Json
          content_visibility?: string
          country_id?: string | null
          created_at?: string
          cron_config?: Json
          currency?: string | null
          email_digest?: boolean
          hide_actions?: boolean
          id?: string
          language?: string
          lenser_id: string
          notifications?: Json
          selected_api_key_id?: string | null
          sidebar?: Json
          theme?: string
          updated_at?: string
          wallet_mode?: Database["lensers"]["Enums"]["wallet_mode_enum"]
        }
        Update: {
          active_lenser_id?: string | null
          ai_data_usage?: boolean
          ai_model_key?: string | null
          ai_persona?: string | null
          ai_provider_key?: string | null
          ai_ruleset?: Json
          content_visibility?: string
          country_id?: string | null
          created_at?: string
          cron_config?: Json
          currency?: string | null
          email_digest?: boolean
          hide_actions?: boolean
          id?: string
          language?: string
          lenser_id?: string
          notifications?: Json
          selected_api_key_id?: string | null
          sidebar?: Json
          theme?: string
          updated_at?: string
          wallet_mode?: Database["lensers"]["Enums"]["wallet_mode_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "preferences_active_lenser_id_fkey"
            columns: ["active_lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_active_lenser_id_fkey"
            columns: ["active_lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_active_lenser_id_fkey"
            columns: ["active_lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
          {
            foreignKeyName: "preferences_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: true
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "preferences_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: true
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_model_id: string | null
          avatar_url: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          deletion_deadline_at: string | null
          deletion_requested_at: string | null
          display_name: string
          handle: string
          headline: string | null
          id: string
          is_in_waiting_list: boolean | null
          is_super_admin: boolean
          join_order: number | null
          journey_state: Json
          last_active_at: string | null
          last_handle_changed_at: string | null
          last_login_at: string | null
          location: string | null
          login_count: number | null
          onboarding_completed_at: string | null
          onboarding_step: number
          referral_source: string | null
          status: Database["lensers"]["Enums"]["lenser_status"]
          type: Database["lensers"]["Enums"]["lenser_type"]
          updated_at: string
          user_id: string | null
          visibility: Database["lensers"]["Enums"]["lenser_visibility"] | null
          website_url: string | null
        }
        Insert: {
          ai_model_id?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deletion_deadline_at?: string | null
          deletion_requested_at?: string | null
          display_name: string
          handle: string
          headline?: string | null
          id?: string
          is_in_waiting_list?: boolean | null
          is_super_admin?: boolean
          join_order?: number | null
          journey_state?: Json
          last_active_at?: string | null
          last_handle_changed_at?: string | null
          last_login_at?: string | null
          location?: string | null
          login_count?: number | null
          onboarding_completed_at?: string | null
          onboarding_step?: number
          referral_source?: string | null
          status?: Database["lensers"]["Enums"]["lenser_status"]
          type?: Database["lensers"]["Enums"]["lenser_type"]
          updated_at?: string
          user_id?: string | null
          visibility?: Database["lensers"]["Enums"]["lenser_visibility"] | null
          website_url?: string | null
        }
        Update: {
          ai_model_id?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          deletion_deadline_at?: string | null
          deletion_requested_at?: string | null
          display_name?: string
          handle?: string
          headline?: string | null
          id?: string
          is_in_waiting_list?: boolean | null
          is_super_admin?: boolean
          join_order?: number | null
          journey_state?: Json
          last_active_at?: string | null
          last_handle_changed_at?: string | null
          last_login_at?: string | null
          location?: string | null
          login_count?: number | null
          onboarding_completed_at?: string | null
          onboarding_step?: number
          referral_source?: string | null
          status?: Database["lensers"]["Enums"]["lenser_status"]
          type?: Database["lensers"]["Enums"]["lenser_type"]
          updated_at?: string
          user_id?: string | null
          visibility?: Database["lensers"]["Enums"]["lenser_visibility"] | null
          website_url?: string | null
        }
        Relationships: []
      }
      relationships: {
        Row: {
          accepted_at: string | null
          id: string
          is_close_circle: boolean
          removed_at: string | null
          requested_at: string
          responded_at: string | null
          source_profile_id: string
          status: Database["lensers"]["Enums"]["relationship_status"]
          target_profile_id: string
        }
        Insert: {
          accepted_at?: string | null
          id?: string
          is_close_circle?: boolean
          removed_at?: string | null
          requested_at?: string
          responded_at?: string | null
          source_profile_id: string
          status?: Database["lensers"]["Enums"]["relationship_status"]
          target_profile_id: string
        }
        Update: {
          accepted_at?: string | null
          id?: string
          is_close_circle?: boolean
          removed_at?: string | null
          requested_at?: string
          responded_at?: string | null
          source_profile_id?: string
          status?: Database["lensers"]["Enums"]["relationship_status"]
          target_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "relationships_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_source_profile_id_fkey"
            columns: ["source_profile_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
          {
            foreignKeyName: "relationships_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "relationships_target_profile_id_fkey"
            columns: ["target_profile_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      social_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          lenser_id: string
          platform: Database["lensers"]["Enums"]["lenser_social_platform"]
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          lenser_id: string
          platform: Database["lensers"]["Enums"]["lenser_social_platform"]
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          lenser_id?: string
          platform?: Database["lensers"]["Enums"]["lenser_social_platform"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lenser_social_links_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenser_social_links_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenser_social_links_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      tag_follows: {
        Row: {
          created_at: string
          id: string
          lenser_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lenser_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lenser_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_follows_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_follows_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "v_lenser_profile_full"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tag_follows_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_lensers_score"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
    }
    Views: {
      v_lenser_profile_full: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          battles_drawn: number | null
          battles_lost: number | null
          battles_played: number | null
          battles_won: number | null
          bio: string | null
          created_at: string | null
          current_level: number | null
          display_name: string | null
          follower_count: number | null
          following_count: number | null
          handle: string | null
          headline: string | null
          id: string | null
          last_active_at: string | null
          lens_count: number | null
          location: string | null
          reputation_score: number | null
          reputation_uncertainty: number | null
          status: Database["lensers"]["Enums"]["lenser_status"] | null
          thread_count: number | null
          total_xp: number | null
          type: Database["lensers"]["Enums"]["lenser_type"] | null
          visibility: Database["lensers"]["Enums"]["lenser_visibility"] | null
          website_url: string | null
          xp: number | null
        }
        Relationships: []
      }
      vw_lensers_score: {
        Row: {
          avatar_url: string | null
          current_level: number | null
          display_name: string | null
          handle: string | null
          lenser_id: string | null
          lenser_score: number | null
          total_xp: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_country_join_order: {
        Args: { p_country_code: string; p_lenser_id: string }
        Returns: undefined
      }
      auto_award_badges_from_join_order: {
        Args: { p_lenser_id: string }
        Returns: undefined
      }
      auto_award_badges_from_level: {
        Args: {
          p_app_id: string
          p_event_id: string
          p_lenser_id: string
          p_new_level: number
          p_old_level: number
        }
        Returns: undefined
      }
      auto_award_badges_from_streak: {
        Args: { p_event_id: string; p_lenser_id: string; p_streak: number }
        Returns: undefined
      }
      award_badge: {
        Args: {
          p_description?: string
          p_icon?: string
          p_label: string
          p_lenser_id: string
          p_type: Database["lensers"]["Enums"]["lenser_badge_type"]
          p_xp_event_id?: string
        }
        Returns: undefined
      }
      build_author_profile: { Args: { p_lenser_id: string }; Returns: Json }
      current_active_lenser_id: { Args: never; Returns: string }
      delete_expired_lensers: { Args: never; Returns: undefined }
      fn_can_view_profile: {
        Args: { p_subject_profile_id: string; p_viewer_auth_uid: string }
        Returns: Database["lensers"]["Enums"]["profile_access_level"]
      }
      fn_relationship_state: {
        Args: { p_subject_id: string; p_viewer_id: string }
        Returns: Json
      }
      get_auth_human_lenser_id: { Args: never; Returns: string }
      get_auth_lenser_id: { Args: never; Returns: string }
      is_active_lenser: { Args: { p_user_id: string }; Returns: boolean }
      log_account_lifecycle_event: {
        Args: {
          p_actor_source: string
          p_event_type: string
          p_from_status: Database["lensers"]["Enums"]["lenser_status"]
          p_metadata?: Json
          p_profile_id: string
          p_to_status: Database["lensers"]["Enums"]["lenser_status"]
          p_user_id: string
        }
        Returns: undefined
      }
      user_owns_lenser: { Args: { lenser_id: string }; Returns: boolean }
    }
    Enums: {
      group_member_role_enum: "admin" | "moderator" | "member" | "judge"
      group_type_enum: "community" | "team"
      group_visibility_enum: "public" | "private" | "invite_only"
      lenser_badge_category: "prestige" | "achievement"
      lenser_badge_type:
        | "system"
        | "community"
        | "challenge"
        | "prestige_first_10"
        | "prestige_first_100"
        | "prestige_first_1000"
        | "achievement_xp_level"
        | "achievement_xp_milestone"
        | "COUNTRY_TOP_1"
        | "COUNTRY_TOP_10"
        | "COUNTRY_TOP_100"
        | "FOUNDING_10"
        | "FOUNDING_100"
        | "FOUNDING_1000"
      lenser_social_platform:
        | "Behance"
        | "Dribbble"
        | "GitHub"
        | "Instagram"
        | "LinkedIn"
        | "Twitch"
        | "Website"
        | "X"
        | "Twitter"
        | "Youtube"
        | "Facebook"
      lenser_status:
        | "active"
        | "suspended"
        | "deactivated"
        | "pending_deletion"
        | "deleted"
      lenser_type: "human" | "ai"
      lenser_visibility: "public" | "community" | "private"
      profile_access_level:
        | "FULL_PROFILE"
        | "RESTRICTED_PROFILE"
        | "OWNER_RECOVERY_PROFILE"
        | "UNAVAILABLE_PROFILE"
      relationship_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "blocked"
        | "removed"
      wallet_mode_enum: "CLOUD" | "BYOK" | "LOCAL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  lenses: {
    Tables: {
      capability_index: {
        Row: {
          capability_tags: string[]
          content_hash: string
          fts_doc: unknown
          indexed_at: string
          input_kinds: string[]
          lens_kind: string
          output_kinds: string[]
          summary: string
        }
        Insert: {
          capability_tags?: string[]
          content_hash: string
          fts_doc: unknown
          indexed_at?: string
          input_kinds?: string[]
          lens_kind: string
          output_kinds?: string[]
          summary: string
        }
        Update: {
          capability_tags?: string[]
          content_hash?: string
          fts_doc?: unknown
          indexed_at?: string
          input_kinds?: string[]
          lens_kind?: string
          output_kinds?: string[]
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "capability_index_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: true
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      contract_channels: {
        Row: {
          channel: string
          content_hash: string
          lens_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          channel: string
          content_hash: string
          lens_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          channel?: string
          content_hash?: string
          lens_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_channels_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
          {
            foreignKeyName: "contract_channels_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_channels_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_channels_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          algorithm: string
          content_hash: string
          key_id: string
          signature: string
          signed_at: string
        }
        Insert: {
          algorithm: string
          content_hash: string
          key_id: string
          signature: string
          signed_at?: string
        }
        Update: {
          algorithm?: string
          content_hash?: string
          key_id?: string
          signature?: string
          signed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      contracts: {
        Row: {
          body: Json
          content_hash: string
          kind: string
          lens_id: string
          published_at: string
          published_by: string
          semver: string
          spec_version: string
          supersedes_hash: string | null
          version_id: string
        }
        Insert: {
          body: Json
          content_hash: string
          kind?: string
          lens_id: string
          published_at?: string
          published_by: string
          semver: string
          spec_version?: string
          supersedes_hash?: string | null
          version_id: string
        }
        Update: {
          body?: Json
          content_hash?: string
          kind?: string
          lens_id?: string
          published_at?: string
          published_by?: string
          semver?: string
          spec_version?: string
          supersedes_hash?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_supersedes_hash_fkey"
            columns: ["supersedes_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
          {
            foreignKeyName: "contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
        ]
      }
      dependency_edges: {
        Row: {
          binding: string
          child_content_hash: string
          depth: number
          edge_metadata: Json | null
          parent_content_hash: string
        }
        Insert: {
          binding?: string
          child_content_hash: string
          depth: number
          edge_metadata?: Json | null
          parent_content_hash: string
        }
        Update: {
          binding?: string
          child_content_hash?: string
          depth?: number
          edge_metadata?: Json | null
          parent_content_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "dependency_edges_child_content_hash_fkey"
            columns: ["child_content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
          {
            foreignKeyName: "dependency_edges_parent_content_hash_fkey"
            columns: ["parent_content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      execution_records: {
        Row: {
          compiled_at: string
          content_hash: string
          execution_status: string
          id: string
          idempotency_key: string | null
          principal_kind: string
          principal_lenser_id: string | null
          resolved_inputs: Json
          trace_id: string
          violation: Json | null
        }
        Insert: {
          compiled_at?: string
          content_hash: string
          execution_status?: string
          id?: string
          idempotency_key?: string | null
          principal_kind?: string
          principal_lenser_id?: string | null
          resolved_inputs?: Json
          trace_id?: string
          violation?: Json | null
        }
        Update: {
          compiled_at?: string
          content_hash?: string
          execution_status?: string
          id?: string
          idempotency_key?: string | null
          principal_kind?: string
          principal_lenser_id?: string | null
          resolved_inputs?: Json
          trace_id?: string
          violation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_records_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      lenses: {
        Row: {
          created_at: string
          featured_at: string | null
          forked_from_execution_id: string | null
          forked_from_version_id: string | null
          head_version_id: string | null
          id: string
          is_featured: boolean
          lenser_id: string
          parent_lens_id: string | null
          status: Database["content"]["Enums"]["content_status"]
          updated_at: string
          visibility: Database["content"]["Enums"]["visibility_enum"]
        }
        Insert: {
          created_at?: string
          featured_at?: string | null
          forked_from_execution_id?: string | null
          forked_from_version_id?: string | null
          head_version_id?: string | null
          id?: string
          is_featured?: boolean
          lenser_id?: string
          parent_lens_id?: string | null
          status?: Database["content"]["Enums"]["content_status"]
          updated_at?: string
          visibility?: Database["content"]["Enums"]["visibility_enum"]
        }
        Update: {
          created_at?: string
          featured_at?: string | null
          forked_from_execution_id?: string | null
          forked_from_version_id?: string | null
          head_version_id?: string | null
          id?: string
          is_featured?: boolean
          lenser_id?: string
          parent_lens_id?: string | null
          status?: Database["content"]["Enums"]["content_status"]
          updated_at?: string
          visibility?: Database["content"]["Enums"]["visibility_enum"]
        }
        Relationships: [
          {
            foreignKeyName: "lenses_forked_from_version_id_fkey"
            columns: ["forked_from_version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_forked_from_version_id_fkey"
            columns: ["forked_from_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_forked_from_version_id_fkey"
            columns: ["forked_from_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "lenses_head_version_id_fkey"
            columns: ["head_version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_head_version_id_fkey"
            columns: ["head_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_head_version_id_fkey"
            columns: ["head_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
        ]
      }
      parameter_contracts: {
        Row: {
          classification: string
          content_hash: string
          default_spec: Json | null
          deprecation: Json | null
          kind: string
          label: string
          overrideable_by: string[]
          required: boolean
          scope: string
          sort_order: number
          tool_id: string | null
          type: string
          validation: Json | null
        }
        Insert: {
          classification?: string
          content_hash: string
          default_spec?: Json | null
          deprecation?: Json | null
          kind?: string
          label: string
          overrideable_by?: string[]
          required?: boolean
          scope?: string
          sort_order?: number
          tool_id?: string | null
          type: string
          validation?: Json | null
        }
        Update: {
          classification?: string
          content_hash?: string
          default_spec?: Json | null
          deprecation?: Json | null
          kind?: string
          label?: string
          overrideable_by?: string[]
          required?: boolean
          scope?: string
          sort_order?: number
          tool_id?: string | null
          type?: string
          validation?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "parameter_contracts_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
          {
            foreignKeyName: "parameter_contracts_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      parameter_deprecations: {
        Row: {
          deprecated_at: string
          from_content_hash: string
          label: string
          migration_recipe: Json | null
          removal_planned_at: string | null
          to_content_hash: string | null
          to_label: string | null
        }
        Insert: {
          deprecated_at?: string
          from_content_hash: string
          label: string
          migration_recipe?: Json | null
          removal_planned_at?: string | null
          to_content_hash?: string | null
          to_label?: string | null
        }
        Update: {
          deprecated_at?: string
          from_content_hash?: string
          label?: string
          migration_recipe?: Json | null
          removal_planned_at?: string | null
          to_content_hash?: string | null
          to_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parameter_deprecations_from_content_hash_fkey"
            columns: ["from_content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
          {
            foreignKeyName: "parameter_deprecations_to_content_hash_fkey"
            columns: ["to_content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      schedule_calendars: {
        Row: {
          created_at: string
          dates: string[]
          id: string
          is_seed: boolean
          kind: string
          lenser_id: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dates?: string[]
          id?: string
          is_seed?: boolean
          kind: string
          lenser_id: string
          name: string
          timezone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dates?: string[]
          id?: string
          is_seed?: boolean
          kind?: string
          lenser_id?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_scopes: {
        Row: {
          abac_predicate: Json | null
          content_hash: string
          required_scope: string
          scope_kind: string
        }
        Insert: {
          abac_predicate?: Json | null
          content_hash: string
          required_scope: string
          scope_kind?: string
        }
        Update: {
          abac_predicate?: Json | null
          content_hash?: string
          required_scope?: string
          scope_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_scopes_content_hash_fkey"
            columns: ["content_hash"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["content_hash"]
          },
        ]
      }
      steps: {
        Row: {
          created_at: string
          id: string
          input_map: Json | null
          instruction: string | null
          lens_id: string
          model_id: string | null
          ordinal: number
          output_key: string | null
          step_type: string
          sub_lens_id: string | null
          updated_at: string
          version_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          input_map?: Json | null
          instruction?: string | null
          lens_id: string
          model_id?: string | null
          ordinal: number
          output_key?: string | null
          step_type: string
          sub_lens_id?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          input_map?: Json | null
          instruction?: string | null
          lens_id?: string
          model_id?: string | null
          ordinal?: number
          output_key?: string | null
          step_type?: string
          sub_lens_id?: string | null
          updated_at?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lens_steps_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_steps_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_steps_lens_id_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_steps_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "steps_sub_lens_id_fkey"
            columns: ["sub_lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_sub_lens_id_fkey"
            columns: ["sub_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steps_sub_lens_id_fkey"
            columns: ["sub_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
        ]
      }
      tools: {
        Row: {
          category: string
          color: string | null
          created_at: string
          description: string | null
          governance_class: string
          help_text: string | null
          icon: string | null
          id: string
          is_protected: boolean
          is_system: boolean
          key: string
          label: string | null
          max_length: number
          min_length: number
          options: Json | null
          placeholder: string | null
          required: boolean
          sort_order: number
          type: string
          updated_at: string
          validation_schema: Json | null
        }
        Insert: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          governance_class?: string
          help_text?: string | null
          icon?: string | null
          id?: string
          is_protected?: boolean
          is_system?: boolean
          key: string
          label?: string | null
          max_length?: number
          min_length?: number
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          type: string
          updated_at?: string
          validation_schema?: Json | null
        }
        Update: {
          category?: string
          color?: string | null
          created_at?: string
          description?: string | null
          governance_class?: string
          help_text?: string | null
          icon?: string | null
          id?: string
          is_protected?: boolean
          is_system?: boolean
          key?: string
          label?: string | null
          max_length?: number
          min_length?: number
          options?: Json | null
          placeholder?: string | null
          required?: boolean
          sort_order?: number
          type?: string
          updated_at?: string
          validation_schema?: Json | null
        }
        Relationships: []
      }
      tutorial_completions: {
        Row: {
          completed_at: string
          id: string
          kind: string
          lenser_id: string
          tutorial_slug: string
        }
        Insert: {
          completed_at?: string
          id?: string
          kind?: string
          lenser_id: string
          tutorial_slug: string
        }
        Update: {
          completed_at?: string
          id?: string
          kind?: string
          lenser_id?: string
          tutorial_slug?: string
        }
        Relationships: []
      }
      version_parameter_contents: {
        Row: {
          contents: Json
          created_at: string
          id: string
          lenser_id: string
          parameter_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          contents?: Json
          created_at?: string
          id?: string
          lenser_id: string
          parameter_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          contents?: Json
          created_at?: string
          id?: string
          lenser_id?: string
          parameter_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "version_parameter_contents_parameter_id_fkey"
            columns: ["parameter_id"]
            isOneToOne: false
            referencedRelation: "version_parameters"
            referencedColumns: ["id"]
          },
        ]
      }
      version_parameters: {
        Row: {
          id: string
          label: string
          tool_id: string
          version_id: string
        }
        Insert: {
          id?: string
          label: string
          tool_id: string
          version_id: string
        }
        Update: {
          id?: string
          label?: string
          tool_id?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lens_version_params_version_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_version_params_version_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_version_params_version_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "version_parameters_tool_id_fkey"
            columns: ["tool_id"]
            isOneToOne: false
            referencedRelation: "tools"
            referencedColumns: ["id"]
          },
        ]
      }
      versions: {
        Row: {
          changelog: string | null
          content_hash: string | null
          created_at: string
          id: string
          input_contract: Json | null
          lens_id: string
          output_contract: Json | null
          parent_version_id: string | null
          published_at: string | null
          semver: string | null
          status: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }
        Insert: {
          changelog?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          input_contract?: Json | null
          lens_id: string
          output_contract?: Json | null
          parent_version_id?: string | null
          published_at?: string | null
          semver?: string | null
          status?: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }
        Update: {
          changelog?: string | null
          content_hash?: string | null
          created_at?: string
          id?: string
          input_contract?: Json | null
          lens_id?: string
          output_contract?: Json | null
          parent_version_id?: string | null
          published_at?: string | null
          semver?: string | null
          status?: Database["content"]["Enums"]["content_status"]
          template_body?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          condition: Json | null
          id: string
          merge_strategy: string | null
          source_node_id: string
          source_output_key: string
          target_node_id: string
          target_param_label: string
          workflow_id: string
        }
        Insert: {
          condition?: Json | null
          id?: string
          merge_strategy?: string | null
          source_node_id: string
          source_output_key?: string
          target_node_id: string
          target_param_label: string
          workflow_id: string
        }
        Update: {
          condition?: Json | null
          id?: string
          merge_strategy?: string | null
          source_node_id?: string
          source_output_key?: string
          target_node_id?: string
          target_param_label?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wf_edges_source"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_edges_target"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_edges_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_node_results: {
        Row: {
          completed_at: string | null
          cost_credits: number
          duration_ms: number | null
          error_message: string | null
          execution_run_id: string | null
          id: string
          input_tokens: number
          node_id: string
          output_data: Json | null
          output_tokens: number
          retry_count: number
          run_id: string
          started_at: string | null
          status: string
          ttfb_ms: number | null
          waiting_reason: string | null
        }
        Insert: {
          completed_at?: string | null
          cost_credits?: number
          duration_ms?: number | null
          error_message?: string | null
          execution_run_id?: string | null
          id?: string
          input_tokens?: number
          node_id: string
          output_data?: Json | null
          output_tokens?: number
          retry_count?: number
          run_id: string
          started_at?: string | null
          status?: string
          ttfb_ms?: number | null
          waiting_reason?: string | null
        }
        Update: {
          completed_at?: string | null
          cost_credits?: number
          duration_ms?: number | null
          error_message?: string | null
          execution_run_id?: string | null
          id?: string
          input_tokens?: number
          node_id?: string
          output_data?: Json | null
          output_tokens?: number
          retry_count?: number
          run_id?: string
          started_at?: string | null
          status?: string
          ttfb_ms?: number | null
          waiting_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_wnr_node"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "workflow_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wnr_run"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          config: Json
          created_at: string
          id: string
          label: string | null
          lens_id: string | null
          ordinal: number
          position_x: number
          position_y: number
          version_id: string | null
          workflow_id: string
        }
        Insert: {
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          lens_id?: string | null
          ordinal?: number
          position_x?: number
          position_y?: number
          version_id?: string | null
          workflow_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          label?: string | null
          lens_id?: string | null
          ordinal?: number
          position_x?: number
          position_y?: number
          version_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wf_nodes_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "fk_wf_nodes_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_phases: {
        Row: {
          created_at: string
          description: string | null
          id: string
          ordinal: number
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          ordinal?: number
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          ordinal?: number
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_phases_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_chains: {
        Row: {
          chain_reason: string | null
          child_run_id: string
          created_at: string
          id: string
          parent_run_id: string
        }
        Insert: {
          chain_reason?: string | null
          child_run_id: string
          created_at?: string
          id?: string
          parent_run_id: string
        }
        Update: {
          chain_reason?: string | null
          child_run_id?: string
          created_at?: string
          id?: string
          parent_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_chains_child_run_id_fkey"
            columns: ["child_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_chains_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_dead_letters: {
        Row: {
          attempt_count: number
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          last_attempt_at: string
          node_id: string | null
          payload: Json
          resolved_at: string | null
          run_id: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string
          node_id?: string | null
          payload?: Json
          resolved_at?: string | null
          run_id: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          last_attempt_at?: string
          node_id?: string | null
          payload?: Json
          resolved_at?: string | null
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_dead_letters_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_events: {
        Row: {
          created_at: string
          event_id: number
          id: string
          payload: Json
          run_id: string
          type: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: string
          payload?: Json
          run_id: string
          type: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: string
          payload?: Json
          run_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_events_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_provenance: {
        Row: {
          created_at: string
          id: string
          source_node_id: string
          source_output_path: string
          source_run_id: string
          target_input_path: string
          target_node_id: string
          target_run_id: string
          transform: Json | null
        }
        Insert: {
          created_at?: string
          id?: string
          source_node_id: string
          source_output_path: string
          source_run_id: string
          target_input_path: string
          target_node_id: string
          target_run_id: string
          transform?: Json | null
        }
        Update: {
          created_at?: string
          id?: string
          source_node_id?: string
          source_output_path?: string
          source_run_id?: string
          target_input_path?: string
          target_node_id?: string
          target_run_id?: string
          transform?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_provenance_source_run_id_fkey"
            columns: ["source_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_run_provenance_target_run_id_fkey"
            columns: ["target_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_run_tags: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          node_id: string | null
          run_id: string
          severity: string
          tag: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          node_id?: string | null
          run_id: string
          severity?: string
          tag: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          node_id?: string | null
          run_id?: string
          severity?: string
          tag?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_run_tags_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_runs: {
        Row: {
          active_node_id: string | null
          ai_lenser_id: string | null
          budget_credits: number | null
          completed_at: string | null
          context_inputs: Json
          cost_metadata: Json
          created_at: string
          global_model_id: string | null
          heartbeat_at: string | null
          id: string
          idempotency_expires_at: string | null
          idempotency_key: string | null
          media_manifest: Json
          metadata: Json
          parent_run_id: string | null
          recursion_depth: number
          run_worker_id: string | null
          schedule_id: string | null
          scheduled_for: string | null
          spent_credits: number
          started_at: string | null
          status: string
          trigger_mode: string
          triggered_by: string | null
          workflow_id: string
        }
        Insert: {
          active_node_id?: string | null
          ai_lenser_id?: string | null
          budget_credits?: number | null
          completed_at?: string | null
          context_inputs?: Json
          cost_metadata?: Json
          created_at?: string
          global_model_id?: string | null
          heartbeat_at?: string | null
          id?: string
          idempotency_expires_at?: string | null
          idempotency_key?: string | null
          media_manifest?: Json
          metadata?: Json
          parent_run_id?: string | null
          recursion_depth?: number
          run_worker_id?: string | null
          schedule_id?: string | null
          scheduled_for?: string | null
          spent_credits?: number
          started_at?: string | null
          status?: string
          trigger_mode?: string
          triggered_by?: string | null
          workflow_id: string
        }
        Update: {
          active_node_id?: string | null
          ai_lenser_id?: string | null
          budget_credits?: number | null
          completed_at?: string | null
          context_inputs?: Json
          cost_metadata?: Json
          created_at?: string
          global_model_id?: string | null
          heartbeat_at?: string | null
          id?: string
          idempotency_expires_at?: string | null
          idempotency_key?: string | null
          media_manifest?: Json
          metadata?: Json
          parent_run_id?: string | null
          recursion_depth?: number
          run_worker_id?: string | null
          schedule_id?: string | null
          scheduled_for?: string | null
          spent_credits?: number
          started_at?: string | null
          status?: string
          trigger_mode?: string
          triggered_by?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_wf_runs_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "workflow_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_schedules: {
        Row: {
          approval_policy: Json
          assignee_id: string | null
          assignee_type: string
          calendar_id: string | null
          created_at: string
          cron_expr: string
          description: string | null
          failure_policy: Json
          global_model_id: string | null
          id: string
          inputs_rotation: Json | null
          inputs_template: Json
          is_active: boolean
          last_completed_at: string | null
          last_dispatch_status: string | null
          last_error_at: string | null
          last_error_message: string | null
          last_result: Json
          last_rotation_index: number
          last_run_at: string | null
          last_run_id: string | null
          next_run_at: string | null
          pre_dispatch_condition: Json | null
          queue_policy: Json
          retry_policy: Json
          timezone: string
          workflow_assignment_id: string | null
          workflow_id: string
        }
        Insert: {
          approval_policy?: Json
          assignee_id?: string | null
          assignee_type?: string
          calendar_id?: string | null
          created_at?: string
          cron_expr: string
          description?: string | null
          failure_policy?: Json
          global_model_id?: string | null
          id?: string
          inputs_rotation?: Json | null
          inputs_template?: Json
          is_active?: boolean
          last_completed_at?: string | null
          last_dispatch_status?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_result?: Json
          last_rotation_index?: number
          last_run_at?: string | null
          last_run_id?: string | null
          next_run_at?: string | null
          pre_dispatch_condition?: Json | null
          queue_policy?: Json
          retry_policy?: Json
          timezone?: string
          workflow_assignment_id?: string | null
          workflow_id: string
        }
        Update: {
          approval_policy?: Json
          assignee_id?: string | null
          assignee_type?: string
          calendar_id?: string | null
          created_at?: string
          cron_expr?: string
          description?: string | null
          failure_policy?: Json
          global_model_id?: string | null
          id?: string
          inputs_rotation?: Json | null
          inputs_template?: Json
          is_active?: boolean
          last_completed_at?: string | null
          last_dispatch_status?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_result?: Json
          last_rotation_index?: number
          last_run_at?: string | null
          last_run_id?: string | null
          next_run_at?: string | null
          pre_dispatch_condition?: Json | null
          queue_policy?: Json
          retry_policy?: Json
          timezone?: string
          workflow_assignment_id?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_schedules_calendar_id_fkey"
            columns: ["calendar_id"]
            isOneToOne: false
            referencedRelation: "schedule_calendars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_schedules_last_run_id_fkey"
            columns: ["last_run_id"]
            isOneToOne: false
            referencedRelation: "workflow_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_schedules_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_tasks: {
        Row: {
          created_at: string
          id: string
          model_hint: string | null
          ordinal: number
          output_type: string
          phase_id: string
          prompt_text: string | null
          title: string
          updated_at: string
          workflow_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          model_hint?: string | null
          ordinal?: number
          output_type?: string
          phase_id: string
          prompt_text?: string | null
          title: string
          updated_at?: string
          workflow_id: string
        }
        Update: {
          created_at?: string
          id?: string
          model_hint?: string | null
          ordinal?: number
          output_type?: string
          phase_id?: string
          prompt_text?: string | null
          title?: string
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_tasks_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "workflow_phases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_tasks_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_triggers: {
        Row: {
          condition: Json
          created_at: string
          enabled: boolean
          id: string
          last_fired_at: string | null
          owner_id: string
          trigger_type: string
          webhook_secret: string | null
          workflow_id: string
        }
        Insert: {
          condition?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_fired_at?: string | null
          owner_id: string
          trigger_type: string
          webhook_secret?: string | null
          workflow_id: string
        }
        Update: {
          condition?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          last_fired_at?: string | null
          owner_id?: string
          trigger_type?: string
          webhook_secret?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_triggers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_version_edges: {
        Row: {
          id: string
          source_node_id: string
          source_output_key: string
          target_node_id: string
          target_param_label: string
          workflow_version_id: string
        }
        Insert: {
          id?: string
          source_node_id: string
          source_output_key?: string
          target_node_id: string
          target_param_label: string
          workflow_version_id: string
        }
        Update: {
          id?: string
          source_node_id?: string
          source_output_key?: string
          target_node_id?: string
          target_param_label?: string
          workflow_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wve_fk_source"
            columns: ["source_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_version_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wve_fk_target"
            columns: ["target_node_id"]
            isOneToOne: false
            referencedRelation: "workflow_version_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wve_fk_version"
            columns: ["workflow_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_version_nodes: {
        Row: {
          config: Json
          id: string
          label: string | null
          lens_id: string
          ordinal: number
          position_x: number
          position_y: number
          version_id: string | null
          workflow_version_id: string
        }
        Insert: {
          config?: Json
          id?: string
          label?: string | null
          lens_id: string
          ordinal?: number
          position_x?: number
          position_y?: number
          version_id?: string | null
          workflow_version_id: string
        }
        Update: {
          config?: Json
          id?: string
          label?: string | null
          lens_id?: string
          ordinal?: number
          position_x?: number
          position_y?: number
          version_id?: string | null
          workflow_version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wvn_fk_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wvn_fk_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wvn_fk_lens"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wvn_fk_lens_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wvn_fk_lens_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wvn_fk_lens_version"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
          {
            foreignKeyName: "wvn_fk_version"
            columns: ["workflow_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          changelog: string | null
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          status: string
          version_number: number
          workflow_id: string
        }
        Insert: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          version_number: number
          workflow_id: string
        }
        Update: {
          changelog?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          status?: string
          version_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_fk_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          battle_count: number
          created_at: string
          description: string | null
          fork_count: number
          head_version_id: string | null
          id: string
          lenser_id: string
          parent_workflow_id: string | null
          reaction_totals: Json
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          battle_count?: number
          created_at?: string
          description?: string | null
          fork_count?: number
          head_version_id?: string | null
          id?: string
          lenser_id: string
          parent_workflow_id?: string | null
          reaction_totals?: Json
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          battle_count?: number
          created_at?: string
          description?: string | null
          fork_count?: number
          head_version_id?: string | null
          id?: string
          lenser_id?: string
          parent_workflow_id?: string | null
          reaction_totals?: Json
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_fk_head_version"
            columns: ["head_version_id"]
            isOneToOne: false
            referencedRelation: "workflow_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflows_parent_workflow_id_fkey"
            columns: ["parent_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_fork_history: {
        Row: {
          depth: number | null
          forked_from_lens_id: string | null
          forked_from_lenser_avatar_url: string | null
          forked_from_lenser_handle: string | null
          forked_from_lenser_id: string | null
          forked_from_lenser_name: string | null
          forked_from_title: string | null
          forked_from_version_id: string | null
          forked_from_version_number: number | null
          lens_id: string | null
          lens_title: string | null
        }
        Relationships: []
      }
      vw_hot_scores: {
        Row: {
          hot_score: number | null
          id: string | null
          primary_language: string | null
        }
        Relationships: []
      }
      vw_lens_version_history: {
        Row: {
          changelog: string | null
          created_at: string | null
          id: string | null
          lens_id: string | null
          parameter_count: number | null
          parent_version_id: string | null
          published_at: string | null
          status: Database["content"]["Enums"]["content_status"] | null
          template_body: string | null
          version_number: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_lens_fkey"
            columns: ["lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lens_version_history"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lens_versions_parent_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["latest_version_id"]
          },
        ]
      }
      vw_lenses: {
        Row: {
          author_avatar_url: string | null
          author_display_name: string | null
          author_handle: string | null
          content: string | null
          created_at: string | null
          description: string | null
          forked_from_execution_id: string | null
          id: string | null
          language_code: string | null
          latest_changelog: string | null
          latest_published_at: string | null
          latest_version_id: string | null
          latest_version_number: number | null
          latest_version_status:
            | Database["content"]["Enums"]["content_status"]
            | null
          lenser_id: string | null
          parent_lens_id: string | null
          status: Database["content"]["Enums"]["content_status"] | null
          title: string | null
          updated_at: string | null
          visibility: Database["content"]["Enums"]["visibility_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "lenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_hot_scores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lenses_parent_lens_id_fkey"
            columns: ["parent_lens_id"]
            isOneToOne: false
            referencedRelation: "vw_lenses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      fn_build_schedule_condition_context: {
        Args: { p_schedule_id: string }
        Returns: Json
      }
      fn_check_calendar: {
        Args: { p_calendar_id: string; p_now?: string }
        Returns: boolean
      }
      fn_check_dag_acyclic: {
        Args: { p_workflow_id: string }
        Returns: boolean
      }
      fn_check_dag_acyclic_kahn: {
        Args: { p_workflow_id: string }
        Returns: boolean
      }
      fn_check_workflow_budget: {
        Args: { p_estimated_cost: number; p_run_id: string }
        Returns: boolean
      }
      fn_claim_scheduled_workflow_run: {
        Args: { p_worker_id: string }
        Returns: {
          ai_lenser_id: string
          context_inputs: Json
          global_model_id: string
          run_id: string
          schedule_id: string
          triggered_by: string
          workflow_id: string
        }[]
      }
      fn_clone_lens: {
        Args: { p_source_lens_id: string; p_version_id?: string }
        Returns: string
      }
      fn_clone_workflow: {
        Args: { p_source_workflow_id: string }
        Returns: string
      }
      fn_count_recent_runs: {
        Args: { p_lenser_id: string; p_window_seconds: number }
        Returns: number
      }
      fn_create_draft_version: {
        Args: {
          p_changelog?: string
          p_lens_id: string
          p_parent_version_id?: string
          p_template_body: string
        }
        Returns: {
          changelog: string | null
          content_hash: string | null
          created_at: string
          id: string
          input_contract: Json | null
          lens_id: string
          output_contract: Json | null
          parent_version_id: string | null
          published_at: string | null
          semver: string | null
          status: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: true
          isSetofReturn: false
        }
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
          p_visibility: Database["content"]["Enums"]["visibility_enum"]
        }
        Returns: string
      }
      fn_create_workflow_version: {
        Args: { p_changelog?: string; p_workflow_id: string }
        Returns: string
      }
      fn_cron_field_matches: {
        Args: { p_field: string; p_value: number }
        Returns: boolean
      }
      fn_cron_matches_now: {
        Args: { p_cron_expr: string; p_now?: string }
        Returns: boolean
      }
      fn_dispatch_scheduled_workflows: { Args: never; Returns: number }
      fn_dispatch_scheduled_workflows_safe: { Args: never; Returns: undefined }
      fn_get_version_params_with_tools: {
        Args: { p_version_id: string }
        Returns: Json
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
      fn_list_lens_versions: {
        Args: { p_lens_id: string; p_limit?: number; p_offset?: number }
        Returns: {
          changelog: string
          created_at: string
          id: string
          lens_id: string
          parameter_count: number
          status: string
          version_number: number
        }[]
      }
      fn_list_tools: { Args: { p_category?: string }; Returns: Json }
      fn_list_versions: {
        Args: { p_lens_id: string }
        Returns: {
          changelog: string | null
          content_hash: string | null
          created_at: string
          id: string
          input_contract: Json | null
          lens_id: string
          output_contract: Json | null
          parent_version_id: string | null
          published_at: string | null
          semver: string | null
          status: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }[]
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_list_versions_paged: {
        Args: { p_cursor?: string; p_lens_id: string; p_limit?: number }
        Returns: {
          changelog: string | null
          content_hash: string | null
          created_at: string
          id: string
          input_contract: Json | null
          lens_id: string
          output_contract: Json | null
          parent_version_id: string | null
          published_at: string | null
          semver: string | null
          status: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }[]
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_move_workflow_run_to_dlq: {
        Args: {
          p_error_code?: string
          p_error_msg?: string
          p_node_id?: string
          p_payload?: Json
          p_run_id: string
        }
        Returns: string
      }
      fn_preview_schedule_ticks: {
        Args: { p_n?: number; p_schedule_id: string }
        Returns: {
          decision: string
          inputs: Json
          reason: string
          tick_at: string
        }[]
      }
      fn_publish_version: { Args: { p_version_id: string }; Returns: undefined }
      fn_publish_workflow_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      fn_render_template: {
        Args: { p_inputs: Json; p_version_id: string }
        Returns: string
      }
      fn_render_version_body: {
        Args: { p_version_id: string }
        Returns: string
      }
      fn_restore_workflow_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
      fn_start_workflow_run:
        | { Args: { p_inputs?: Json; p_workflow_id: string }; Returns: string }
        | {
            Args: {
              p_global_model_id?: string
              p_inputs?: Json
              p_workflow_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_global_model_id?: string
              p_idempotency_key?: string
              p_inputs?: Json
              p_workflow_id: string
            }
            Returns: string
          }
      fn_update_lens:
        | {
            Args: {
              p_description?: string
              p_lens_id: string
              p_tag_ids?: string[]
              p_template_body?: string
              p_title?: string
              p_visibility?: Database["content"]["Enums"]["visibility_enum"]
            }
            Returns: undefined
          }
        | {
            Args: {
              p_description?: string
              p_lens_id: string
              p_params?: Json
              p_tag_ids?: string[]
              p_template_body?: string
              p_title?: string
              p_visibility?: Database["content"]["Enums"]["visibility_enum"]
            }
            Returns: undefined
          }
      fn_upsert_draft_version: {
        Args: {
          p_changelog?: string
          p_lens_id: string
          p_parent_version_id?: string
          p_template_body: string
        }
        Returns: {
          changelog: string | null
          content_hash: string | null
          created_at: string
          id: string
          input_contract: Json | null
          lens_id: string
          output_contract: Json | null
          parent_version_id: string | null
          published_at: string | null
          semver: string | null
          status: Database["content"]["Enums"]["content_status"]
          template_body: string
          version_number: number
        }
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_upsert_workflow_schedule_internal: {
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
      fn_validate_inputs: {
        Args: { p_inputs: Json; p_version_id: string }
        Returns: undefined
      }
      fn_workflow_has_cycle: {
        Args: { p_workflow_id: string }
        Returns: boolean
      }
    }
    Enums: {
      workflow_trigger_type: "cron" | "battle_event" | "webhook" | "manual"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  media: {
    Tables: {
      attachments: {
        Row: {
          attached_at: string
          attached_by: string | null
          binding_key: string
          entity_id: string
          entity_type: string
          id: string
          object_id: string
        }
        Insert: {
          attached_at?: string
          attached_by?: string | null
          binding_key?: string
          entity_id: string
          entity_type: string
          id?: string
          object_id: string
        }
        Update: {
          attached_at?: string
          attached_by?: string | null
          binding_key?: string
          entity_id?: string
          entity_type?: string
          id?: string
          object_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_object_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["id"]
          },
        ]
      }
      objects: {
        Row: {
          access_count: number
          audio_channels: number | null
          audio_sample_rate: number | null
          bucket: string | null
          byte_size: number | null
          checksum_sha256: string | null
          content_text: string | null
          created_at: string
          created_by: string | null
          duration_seconds: number | null
          expires_at: string | null
          external_url: string | null
          id: string
          lifecycle_state: string
          media_type: string
          metadata: Json
          mime_type: string | null
          name: string
          object_key: string | null
          owner_lenser_id: string
          request_id: string | null
          updated_at: string
          video_height: number | null
          video_width: number | null
          visibility: string
          workspace_id: string
        }
        Insert: {
          access_count?: number
          audio_channels?: number | null
          audio_sample_rate?: number | null
          bucket?: string | null
          byte_size?: number | null
          checksum_sha256?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          lifecycle_state?: string
          media_type: string
          metadata?: Json
          mime_type?: string | null
          name: string
          object_key?: string | null
          owner_lenser_id: string
          request_id?: string | null
          updated_at?: string
          video_height?: number | null
          video_width?: number | null
          visibility?: string
          workspace_id: string
        }
        Update: {
          access_count?: number
          audio_channels?: number | null
          audio_sample_rate?: number | null
          bucket?: string | null
          byte_size?: number | null
          checksum_sha256?: string | null
          content_text?: string | null
          created_at?: string
          created_by?: string | null
          duration_seconds?: number | null
          expires_at?: string | null
          external_url?: string | null
          id?: string
          lifecycle_state?: string
          media_type?: string
          metadata?: Json
          mime_type?: string | null
          name?: string
          object_key?: string | null
          owner_lenser_id?: string
          request_id?: string | null
          updated_at?: string
          video_height?: number | null
          video_width?: number | null
          visibility?: string
          workspace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
            foreignKeyName: "notification_aggregates_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_aggregates_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
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
            foreignKeyName: "notification_preferences_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
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
            foreignKeyName: "notifications_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
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
        Relationships: [
          {
            foreignKeyName: "contact_messages_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_wf_runs_lenser"
            columns: ["triggered_by"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
          {
            foreignKeyName: "fk_wf_runs_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "vw_workflows"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_wf_runs_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "vw_workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "v_workflow_run_cost_breakdown"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "v_workflow_run_health"
            referencedColumns: ["run_id"]
          },
          {
            foreignKeyName: "workflow_runs_parent_run_id_fkey"
            columns: ["parent_run_id"]
            isOneToOne: false
            referencedRelation: "v_workflow_run_timeline"
            referencedColumns: ["run_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_wf_runs_workflow"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "vw_workflows"
            referencedColumns: ["id"]
          },
        ]
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
            | "draft"
            | "open"
            | "executing"
            | "voting"
            | "scoring"
            | "closed"
            | "published"
            | "archived"
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
            | "draft"
            | "open"
            | "executing"
            | "voting"
            | "scoring"
            | "closed"
            | "published"
            | "archived"
            | null
          title: string | null
          total_vote_count: number | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_creator_lenser_id_fkey"
            columns: ["creator_lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      vw_content_tags_public: {
        Row: {
          id: string | null
          name: string | null
          slug: string | null
          visibility: Database["content"]["Enums"]["tag_visibility_enum"] | null
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
        Relationships: [
          {
            foreignKeyName: "thread_replies_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
          {
            foreignKeyName: "thread_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "vw_content_thread_replies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_replies_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "vw_content_threads_public"
            referencedColumns: ["id"]
          },
        ]
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
          visibility: Database["content"]["Enums"]["visibility_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "threads_lenser_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      vw_feedback_admin: {
        Row: {
          created_at: string | null
          end_date: string | null
          id: string | null
          message: string | null
          page: string | null
          product_tag: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date: string | null
          status: "pending" | "in_progress" | "resolved" | "closed" | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          message?: string | null
          page?: string | null
          product_tag?: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date?: string | null
          status?: "pending" | "in_progress" | "resolved" | "closed" | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          id?: string | null
          message?: string | null
          page?: string | null
          product_tag?: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date?: string | null
          status?: "pending" | "in_progress" | "resolved" | "closed" | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["user_id"]
          },
        ]
      }
      vw_feedback_user: {
        Row: {
          created_at: string | null
          end_date: string | null
          message: string | null
          page: string | null
          product_tag: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date: string | null
          status: "pending" | "in_progress" | "resolved" | "closed" | null
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          message?: string | null
          page?: string | null
          product_tag?: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date?: string | null
          status?: "pending" | "in_progress" | "resolved" | "closed" | null
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          message?: string | null
          page?: string | null
          product_tag?: "bug" | "feature" | "ui_ux" | "general" | "other" | null
          start_date?: string | null
          status?: "pending" | "in_progress" | "resolved" | "closed" | null
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
        Relationships: [
          {
            foreignKeyName: "global_messages_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "vw_battle_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_messages_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "vw_battles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "global_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
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
          status: Database["lensers"]["Enums"]["lenser_status"] | null
          thread_count: number | null
          total_xp: number | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_totals_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
      }
      vw_lensers_social_links_private: {
        Row: {
          created_at: string | null
          handle: string | null
          id: string | null
          label: string | null
          platform:
            | Database["lensers"]["Enums"]["lenser_social_platform"]
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
            | Database["lensers"]["Enums"]["lenser_social_platform"]
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
          visibility: Database["content"]["Enums"]["visibility_enum"] | null
        }
        Relationships: [
          {
            foreignKeyName: "lenses_lenser_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "fk_workflows_lenser"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
          {
            foreignKeyName: "workflows_parent_workflow_id_fkey"
            columns: ["parent_workflow_id"]
            isOneToOne: false
            referencedRelation: "vw_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_xp_leaderboard_global: {
        Row: {
          app_id: string | null
          current_level: number | null
          lenser_id: string | null
          rank: number | null
          total_xp: number | null
          user: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "xp_totals_lenser_id_fkey"
            columns: ["lenser_id"]
            isOneToOne: false
            referencedRelation: "vw_auth_lenser"
            referencedColumns: ["lenser_id"]
          },
        ]
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
          from: "*"
          to: "vote_anomalies"
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
          from: "*"
          to: "series"
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
          visibility: Database["content"]["Enums"]["visibility_enum"]
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
          from: "*"
          to: "shared_links"
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
          from: "*"
          to: "shared_links"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_analytics_shared_links_get: {
        Args: { p_short_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "shared_links"
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
        Returns: Database["agents"]["Tables"]["tool_assignments"]["Row"]
        SetofOptions: {
          from: "*"
          to: "tool_assignments"
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
          from: "*"
          to: "templates"
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
          from: "*"
          to: "templates"
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
          from: "*"
          to: "submissions"
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
          from: "*"
          to: "templates"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_battles_vote:
        | {
            Args: {
              p_battle_id: string
              p_rationale?: string
              p_vote: "contender_a" | "contender_b" | "draw"
            }
            Returns: undefined
          }
        | {
            Args: {
              p_battle_id: string
              p_contender_id?: string
              p_rationale?: string
              p_vote: "contender_a" | "contender_b" | "draw"
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
        Returns: Database["execution"]["Tables"]["byok_keys"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "byok_keys"
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
          from: "*"
          to: "media_quality_results"
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
        Returns: Database["agents"]["Tables"]["scratchpad_runs"]["Row"]
        SetofOptions: {
          from: "*"
          to: "scratchpad_runs"
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
          p_visibility: Database["content"]["Enums"]["visibility_enum"]
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
          visibility: Database["content"]["Enums"]["visibility_enum"]
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
          visibility: Database["content"]["Enums"]["visibility_enum"]
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
          visibility: Database["content"]["Enums"]["visibility_enum"]
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
          reaction: Database["content"]["Enums"]["reaction_enum"]
          target_id: string
          user_id: string
        }[]
      }
      fn_content_reactions_toggle: {
        Args: {
          p_reaction: Database["content"]["Enums"]["reaction_enum"]
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
          visibility: Database["content"]["Enums"]["tag_visibility_enum"]
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
          unit_type: Database["ai"]["Enums"]["unit_type_enum"]
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
      fn_create_battle_series: {
        Args: { p_round_count?: number; p_template_id: string; p_title: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "series"
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
        Returns: Database["agents"]["Tables"]["scratchpad_runs"]["Row"]
        SetofOptions: {
          from: "*"
          to: "scratchpad_runs"
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
          from: "*"
          to: "tournaments"
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
      fn_delete_automation_rule: {
        Args: { p_rule_id: string }
        Returns: undefined
      }
      fn_delete_media_object: {
        Args: { p_object_id: string }
        Returns: undefined
      }
      fn_delete_thread: { Args: { p_thread_id: string }; Returns: undefined }
      fn_delete_thread_reply: {
        Args: { p_reply_id: string }
        Returns: undefined
      }
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
      fn_device_post_challenge: {
        Args: {
          p_device_id: string
          p_signature: string
          p_signed_iat?: string
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
      fn_dispatch_scheduled_workflows_with_approval: {
        Args: never
        Returns: number
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
        Returns: Database["agents"]["Tables"]["gateway_commands"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "gateway_commands"
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
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          finalized_at: string
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
      fn_get_battle_by_slug: {
        Args: { p_slug: string }
        Returns: {
          auto_publish: boolean
          battle_type: string
          creator_lenser_id: string
          deleted_at: string
          execution_starts_at: string
          finalized_at: string
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
          from: "*"
          to: "v_battle_full"
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
          from: "*"
          to: "v_leaderboard"
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
        Returns: Database["lensers"]["Views"]["v_lenser_profile_full"]["Row"]
        SetofOptions: {
          from: "*"
          to: "v_lenser_profile_full"
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
          from: "*"
          to: "model_test_runs"
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
          visibility: Database["content"]["Enums"]["visibility_enum"]
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
        Returns: Database["agents"]["Tables"]["provider_configs"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "provider_configs"
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
        Returns: Database["agents"]["Views"]["v_human_fleet_logs"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "v_human_fleet_logs"
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
        Returns: Database["agents"]["Views"]["v_human_fleet_runs"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "v_human_fleet_runs"
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
          p_contender_ref_id: string
          p_contender_type: string
          p_display_name: string
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
      fn_lensers_create_profile: {
        Args: { p_bio?: string; p_display_name: string; p_handle: string }
        Returns: Json
      }
      fn_lensers_follow: { Args: { p_following_id: string }; Returns: Json }
      fn_lensers_get_active_profile: {
        Args: never
        Returns: Database["lensers"]["Tables"]["profiles"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "profiles"
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
          type: Database["lensers"]["Enums"]["lenser_type"]
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
        Returns: Database["lenses"]["Tables"]["versions"]["Row"]
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_lenses_list_versions: {
        Args: { p_lens_id: string }
        Returns: Database["lenses"]["Tables"]["versions"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "versions"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      fn_lenses_publish_version: {
        Args: { p_version_id: string }
        Returns: undefined
      }
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
          from: "*"
          to: "model_test_runs"
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
          p_target_type: Database["public"]["Enums"]["page_view_target_enum"]
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
        Returns: Database["agents"]["Tables"]["memory_profiles"]["Row"]
        SetofOptions: {
          from: "*"
          to: "memory_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_publish_battle: { Args: { p_battle_id: string }; Returns: Json }
      fn_purge_due_accounts: { Args: never; Returns: number }
      fn_read_memory_entries: {
        Args: {
          p_limit?: number
          p_profile_id: string
          p_scope?: string
          p_team_run_id?: string
        }
        Returns: Database["agents"]["Tables"]["memories"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "memories"
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
        Returns: Database["agents"]["Tables"]["tools_registry"]["Row"]
        SetofOptions: {
          from: "*"
          to: "tools_registry"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      fn_register_tournament_contender: {
        Args: { p_lenser_id?: string; p_tournament_id: string }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "tournament_contenders"
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
        Returns: Database["agents"]["Tables"]["workspace_settings"]["Row"]
        SetofOptions: {
          from: "*"
          to: "workspace_settings"
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
          type: Database["lensers"]["Enums"]["lenser_type"]
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
              p_vote_value: "contender_a" | "contender_b" | "draw"
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
          p_forum_thread_id?: string
          p_handicap_config?: Json
          p_lens_id?: string
          p_task_prompt?: string
          p_title?: string
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
        Returns: Database["agents"]["Tables"]["workspace_settings"]["Row"]
        SetofOptions: {
          from: "*"
          to: "workspace_settings"
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
            Returns: Database["agents"]["Tables"]["lens_bindings"]["Row"][]
            SetofOptions: {
              from: "*"
              to: "lens_bindings"
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
            Returns: Database["agents"]["Tables"]["lens_bindings"]["Row"][]
            SetofOptions: {
              from: "*"
              to: "lens_bindings"
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
        Returns: Database["agents"]["Tables"]["model_bindings"]["Row"][]
        SetofOptions: {
          from: "*"
          to: "model_bindings"
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
        Returns: Database["agents"]["Tables"]["provider_configs"]["Row"]
        SetofOptions: {
          from: "*"
          to: "provider_configs"
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
      fn_worker_upsert_heartbeat: {
        Args: { p_metadata?: Json; p_worker_id: string; p_worker_type: string }
        Returns: undefined
      }
      fn_worker_upsert_node_result: {
        Args: {
          p_error_message?: string
          p_node_id: string
          p_output_data?: Json
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
      page_view_target_enum:
        | "thread"
        | "thread_reply"
        | "lens"
        | "profile"
        | "page"
        | "battle"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  tenancy: {
    Tables: {
      workspace_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          lenser_id: string
          role: string
          workspace_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          lenser_id: string
          role?: string
          workspace_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          lenser_id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          display_name: string
          id: string
          metadata: Json
          org_id: string | null
          owner_lenser_id: string | null
          slug: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          metadata?: Json
          org_id?: string | null
          owner_lenser_id?: string | null
          slug: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          metadata?: Json
          org_id?: string | null
          owner_lenser_id?: string | null
          slug?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_workspace_admin: { Args: { p_workspace_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  agents: {
    Enums: {},
  },
  ai: {
    Enums: {
      ai_capability_enum: ["text", "image", "code", "music"],
      key_scope_enum: ["agent", "user", "team"],
      key_status_enum: ["active", "revoked", "expired"],
      media_type: [
        "text",
        "image",
        "audio",
        "video",
        "document",
        "json",
        "binary",
      ],
      model_tier_enum: ["free", "paid", "enterprise"],
      provider_enum: [
        "openai",
        "anthropic",
        "google",
        "custom",
        "xai",
        "meta",
        "mistral",
        "local",
      ],
      resource_type: ["attachment", "dataset", "example", "reference"],
      unit_type_enum: ["tokens", "image", "video_second", "audio_second"],
    },
  },
  content: {
    Enums: {
      content_status: ["draft", "published", "archived"],
      entity_type_enum: [
        "thread",
        "lens",
        "battle",
        "thread_reply",
        "workflow",
      ],
      payment_method_enum: ["byok", "wallet", "free"],
      reaction_enum: ["like", "dislike", "saved", "copy", "love", "clap"],
      report_reason_enum: [
        "spam",
        "harassment",
        "misinformation",
        "off_topic",
        "other",
      ],
      suggestion_status_enum: ["pending", "accepted", "rejected"],
      tag_visibility_enum: ["public", "private", "hidden"],
      thread_reply_status: ["published", "hidden", "deleted"],
      thread_visibility: ["public", "community", "private"],
      visibility_enum: ["public", "community", "private"],
    },
  },
  execution: {
    Enums: {},
  },
  lensers: {
    Enums: {
      group_member_role_enum: ["admin", "moderator", "member", "judge"],
      group_type_enum: ["community", "team"],
      group_visibility_enum: ["public", "private", "invite_only"],
      lenser_badge_category: ["prestige", "achievement"],
      lenser_badge_type: [
        "system",
        "community",
        "challenge",
        "prestige_first_10",
        "prestige_first_100",
        "prestige_first_1000",
        "achievement_xp_level",
        "achievement_xp_milestone",
        "COUNTRY_TOP_1",
        "COUNTRY_TOP_10",
        "COUNTRY_TOP_100",
        "FOUNDING_10",
        "FOUNDING_100",
        "FOUNDING_1000",
      ],
      lenser_social_platform: [
        "Behance",
        "Dribbble",
        "GitHub",
        "Instagram",
        "LinkedIn",
        "Twitch",
        "Website",
        "X",
        "Twitter",
        "Youtube",
        "Facebook",
      ],
      lenser_status: [
        "active",
        "suspended",
        "deactivated",
        "pending_deletion",
        "deleted",
      ],
      lenser_type: ["human", "ai"],
      lenser_visibility: ["public", "community", "private"],
      profile_access_level: [
        "FULL_PROFILE",
        "RESTRICTED_PROFILE",
        "OWNER_RECOVERY_PROFILE",
        "UNAVAILABLE_PROFILE",
      ],
      relationship_status: [
        "pending",
        "accepted",
        "rejected",
        "blocked",
        "removed",
      ],
      wallet_mode_enum: ["CLOUD", "BYOK", "LOCAL"],
    },
  },
  lenses: {
    Enums: {
      workflow_trigger_type: ["cron", "battle_event", "webhook", "manual"],
    },
  },
  media: {
    Enums: {},
  },
  public: {
    Enums: {
      page_view_target_enum: [
        "thread",
        "thread_reply",
        "lens",
        "profile",
        "page",
        "battle",
      ],
    },
  },
  tenancy: {
    Enums: {},
  },
} as const

