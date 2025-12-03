import { Lenser } from './lenser.types';

export type Visibility = 'public' | 'private' | 'followers';
export type ReactionType = 'like' | 'love' | 'clap';

export interface PromptData {
  title: string;
  description: string;
  actionLabel?: string;
}

export interface CreateThreadDTO {
  title: string;
  content: string;
  tagIds: string[]; // For the mock, we will treat these as tag names or IDs
  lenserId: string;
  visibility: Visibility;
}

export interface ThreadRecord {
  id: string;
  lenser_id: string;
  title: string;
  content: string;
  visibility: Visibility;
  view_count: number;
  reply_count: number;
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
  prompt_data?: PromptData; // Optional embedded prompt
}

export interface TagRecord {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface ThreadTagRecord {
  thread_id: string;
  tag_id: string;
}

export interface ThreadReplyRecord {
  id: string;
  thread_id: string;
  parent_reply_id?: string | null;
  lenser_id: string;
  content: string;
  reaction_count: number;
  created_at: string;
  deleted_at?: string | null;
}

export interface ThreadReactionRecord {
  id: string;
  thread_id: string;
  lenser_id: string;
  created_at: string;
}

export interface ThreadAuthor {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  handle: string;
}

export interface ThreadFeedItem {
  id: string;
  author: ThreadAuthor;
  title: string;
  content: string;
  tags: TagRecord[];
  reactionCount: number;
  replyCount: number;
  createdAt: string;
  userHasReacted: boolean;
}

export interface ThreadReplyViewModel {
  id: string;
  author: ThreadAuthor;
  content: string;
  createdAt: string;
  reactionCount: number;
  isDeleted: boolean;
  replies?: ThreadReplyViewModel[]; // For nesting
}

export interface ThreadDetailViewModel {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: ThreadAuthor;
  tags: TagRecord[];
  reactionCount: number;
  userHasReacted: boolean;
  replies: ThreadReplyViewModel[];
  promptBlock?: PromptData;
}
