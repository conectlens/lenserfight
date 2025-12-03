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
  website?: string;
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