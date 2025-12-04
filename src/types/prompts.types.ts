
import { TagRecord } from './threads.types';

export type VisibilityEnum = 'public' | 'private';
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved' | 'copy';

export interface PromptTemplateRecord {
  id: string;
  lenser_id: string;
  title: string;
  description?: string | null;
  content: string;
  visibility: VisibilityEnum;
  // usage_count removed; rely on reaction_totals['copy']
  reaction_totals?: Record<string, number>; // JSONB
  save_count?: number; // Maintained by trigger
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateTagRecord {
  template_id: string;
  tag_id: string;
  created_at?: string;
  user_agent?: string;
}

export interface PromptTemplateReactionRecord {
  id: string;
  template_id: string;
  lenser_id: string;
  reaction: ReactionEnum;
  created_at: string;
}

export interface PromptAuthor {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
}

export interface PromptTemplateViewModel {
  id: string;
  title: string;
  description?: string | null;
  author: PromptAuthor;
  tags: TagRecord[];
  usageCount: number;
  createdAt: string;
  visibility: VisibilityEnum;
}

export interface PromptTemplateDetailViewModel extends PromptTemplateViewModel {
  content: string;
  reactionCounts: Record<ReactionEnum, number>;
  isSaved: boolean;
}

export interface CreatePromptDTO {
  title: string;
  description?: string | null;
  content: string;
  tagIds: string[];
  visibility: VisibilityEnum;
  lenserId: string;
}
