
import { PromptTemplateRecord } from './prompts.types';
import { ThreadRecord } from './threads.types';

export interface AuthorProfile {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
}

export interface LenserCompactProfile {
  handle: string;
  display_name: string;
  avatar_url: string | null;
  xp: number;
  current_level: number;
}

export interface LenserPreferences {
  theme?: 'light' | 'dark';
  sidebar_collapsed?: boolean;
  [key: string]: any; // Forward compatibility
}

export interface Lenser {
  id: string; // uuid
  user_id?: string; // references auth.users.id (Optional in public views)
  handle: string; // unique
  display_name: string;
  bio?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  headline?: string;
  location?: string;
  website_url?: string;
  website_display_name?: string;
  visibility?: 'public' | 'private';
  is_in_waiting_list?: boolean;
  is_super_admin?: boolean; // Added for RBAC via Lenser profile
  preferences?: LenserPreferences;
  created_at: string;
  updated_at?: string;
  join_order?: number; // Immutable rank from lenser_join_log
  deletion_requested_at?: string | null;
}

export interface LenserBadge {
  type: string;
  category: string;
  label: string;
  description: string | null;
  icon: string | null;
  awarded_at: string;
}

export interface LenserFullProfile {
  // Core Fields
  id: string;
  user_id?: string; // Optional in public views
  handle: string;
  display_name: string;
  bio?: string;
  headline?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
  website_url?: string;
  status?: string;
  join_order?: number;

  // Engagement Stats
  thread_count: number;
  prompt_count: number;
  follower_count: number;
  following_count: number;

  // XP & Gamification
  xp: number;
  current_level: number;
  global_rank: number;
  xp_min: number;
  xp_max: number;
  badges: LenserBadge[];
}

export type SocialPlatform = 'LinkedIn' | 'GitHub' | 'Instagram' | 'Facebook' | 'X' | 'Youtube' | 'Other';

export interface SocialLink {
  id: string;
  lenser_id: string;
  platform: SocialPlatform;
  url: string;
  label?: string | null;
  created_at?: string;
}

export interface CreateLenserDTO {
  handle: string;
  display_name: string;
  bio?: string;
}

export interface LenserState {
  lenser: Lenser | null;
  isLoading: boolean;
  error: string | null;
}

export interface LenserStats {
  promptsCount: number;
  threadsCount: number;
  followersCount: number;
  followingCount: number;
  winsCount: number;
}

export interface LenserActivityPoint {
  date: string;
  count: number;
}

export interface ActionRecord {
  id: string;
  type: string;
  description: string;
  created_at: string;
}

export interface NetworkUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  is_following: boolean;
}