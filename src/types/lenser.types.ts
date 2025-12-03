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
  visibility?: 'public' | 'private';
  created_at: string;
  updated_at?: string;
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
  date: string; // YYYY-MM-DD
  count: number;
}

export interface ReactionRecord {
  id: string;
  created_at: string;
  // simplified for activity tracking
}

export interface ActionRecord {
  id: string;
  type: 'saved_prompt' | 'liked_thread' | 'joined_challenge';
  title: string;
  targetId: string;
  date: string;
}

export interface NetworkUser {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  is_following: boolean;
}