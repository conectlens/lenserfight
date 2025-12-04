
import { PromptTemplateRecord } from './prompts.types';
import { ThreadRecord } from './threads.types';

export interface Lenser {
  id: string; // uuid
  user_id: string; // references auth.users.id
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
  created_at: string;
  updated_at?: string;
  join_order?: number; // Immutable rank from lenser_join_log
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