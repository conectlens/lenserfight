import { TagRecord } from './threads.types';

export type VisibilityEnum = 'public' | 'private';
export type ReactionEnum = 'like' | 'love' | 'clap' | 'saved';

export interface PromptTemplateRecord {
  id: string;
  lenser_id: string;
  title: string;
  description?: string | null;
  content: string;
  visibility: VisibilityEnum;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface PromptTemplateTagRecord {
  template_id: string;
  tag_id: string;
}

export interface PromptTemplateReactionRecord {
  id: string;
  template_id: string;
  lenser_id: string;
  reaction: ReactionEnum;
  created_at: string;
}

export interface PromptTemplateUsageRecord {
  id: string;
  template_id: string;
  lenser_id: string;
  action: string; // e.g. "viewed", "used", "copied"
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
  visibility: VisibilityEnum; // Added visibility to view model for header
}

export interface PromptTemplateDetailViewModel extends PromptTemplateViewModel {
  content: string;
  reactionCounts: Record<ReactionEnum, number>;
  isSaved: boolean; // Indicates if the viewing user has saved this
}

export interface CreatePromptDTO {
  title: string;
  description?: string | null;
  content: string;
  tagIds: string[];
  visibility: VisibilityEnum;
  lenserId: string;
}