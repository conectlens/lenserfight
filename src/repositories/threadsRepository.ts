
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';
import { TagRepositoryPort } from './tagRepository'; // Implicit dep for types, but we use raw storage in mock

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>;
  getAllThreads(offset?: number, limit?: number): Promise<ThreadRecord[]>;
  getThreadsByTag(tagSlug: string, offset?: number, limit?: number): Promise<ThreadRecord[]>;
  getThreadById(id: string): Promise<ThreadRecord | null>;
  getThreadTags(threadId: string): Promise<TagRecord[]>;
  getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]>;
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>;
  getTrendingTags(limit: number): Promise<string[]>;
  createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord>;
  updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord>;
  deleteThread(id: string): Promise<void>;
}

// --- Mock Implementation ---
export class MockThreadsRepository implements ThreadsRepositoryPort {
  private THREADS_KEY = 'mock_threads_db';
  private THREAD_TAGS_KEY = 'mock_thread_tags'; // Junction table key
  private TAGS_KEY = 'mock_tags';
  private REPLIES_KEY = 'mock_replies_db';

  constructor() {
    this.seed();
  }

  private seed() {
    if (!storage.getItem(this.THREADS_KEY)) {
        const initialThreads = [
            {
              id: 'thread-1',
              lenser_id: 'lenser-1',
              title: 'Mastering a Minimalist Digital Toolkit for Enhanced Focus',
              content: "The key to a productive and creative workflow lies not in the multitude of tools, but in the mastery of a few.",
              visibility: 'public',
              view_count: 120,
              reply_count: 0,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
              updated_at: new Date().toISOString(),
            }
        ];
        storage.setItem(this.THREADS_KEY, JSON.stringify(initialThreads));
    }
  }

  private getThreads(): ThreadRecord[] {
      return JSON.parse(storage.getItem(this.THREADS_KEY) || '[]');
  }

  private getThreadTagsData(): { thread_id: string, tag_id: string }[] {
      return JSON.parse(storage.getItem(this.THREAD_TAGS_KEY) || '[]');
  }

  private getReplies(): ThreadReplyRecord[] {
      return JSON.parse(storage.getItem(this.REPLIES_KEY) || '[]');
  }

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    await new Promise(resolve => setTimeout(resolve, 600));

    const newThread: ThreadRecord = {
      id: `thread-${Date.now()}`,
      lenser_id: dto.lenserId,
      title: dto.title,
      content: dto.content,
      visibility: dto.visibility,
      view_count: 0,
      reply_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const threads = this.getThreads();
    threads.unshift(newThread);
    storage.setItem(this.THREADS_KEY, JSON.stringify(threads));

    // Handle Tags (DTO now contains real UUIDs from Service)
    if (dto.tagIds.length > 0) {
      const junctionData = this.getThreadTagsData();
      dto.tagIds.forEach(tagId => {
          junctionData.push({ thread_id: newThread.id, tag_id: tagId });
      });
      storage.setItem(this.THREAD_TAGS_KEY, JSON.stringify(junctionData));
    }

    return newThread;
  }

  async getAllThreads(offset = 0, limit = 10): Promise<ThreadRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 400));
    const replies = this.getReplies();
    const all = this.getThreads()
        .filter(t => t.visibility === 'public')
        .map(t => ({
            ...t,
            reply_count: replies.filter(r => r.thread_id === t.id).length
        }));
    return all.slice(offset, offset + limit);
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Get Tag ID from slug first
      const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
      const tag = allTags.find((t: any) => t.slug === tagSlug);
      
      if (!tag) return [];

      // Find threads with this tag_id
      const junctionData = this.getThreadTagsData();
      const threadIds = junctionData.filter(j => j.tag_id === tag.id).map(j => j.thread_id);

      const replies = this.getReplies();
      const filtered = this.getThreads()
        .filter(t => threadIds.includes(t.id) && t.visibility === 'public')
        .map(t => ({
            ...t,
            reply_count: replies.filter(r => r.thread_id === t.id).length
        }));
      
      return filtered.slice(offset, offset + limit);
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const thread = this.getThreads().find(t => t.id === id);
    if (!thread) return null;
    const replies = this.getReplies();
    return {
        ...thread,
        reply_count: replies.filter(r => r.thread_id === thread.id).length
    };
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const junctionData = this.getThreadTagsData();
    const tagIds = junctionData.filter(j => j.thread_id === threadId).map(j => j.tag_id);
    
    const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
    return allTags.filter((t: any) => tagIds.includes(t.id));
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.getReplies()
        .filter(r => r.thread_id === threadId)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async getReplyById(replyId: string): Promise<ThreadReplyRecord | null> {
    return this.getReplies().find(r => r.id === replyId) || null;
  }

  async createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord> {
      await new Promise(resolve => setTimeout(resolve, 400));
      const newReply: ThreadReplyRecord = {
          id: `reply-${Date.now()}`,
          thread_id: threadId,
          lenser_id: lenserId,
          content,
          parent_reply_id: parentReplyId,
          reaction_count: 0,
          created_at: new Date().toISOString()
      };
      
      const replies = this.getReplies();
      replies.push(newReply);
      storage.setItem(this.REPLIES_KEY, JSON.stringify(replies));
      
      return newReply;
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      // Mock simple return
      return ['productivity', 'health', 'ai'];
  }

  async updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> {
      await new Promise(resolve => setTimeout(resolve, 500));
      const threads = this.getThreads();
      const index = threads.findIndex(t => t.id === id);
      if (index === -1) throw new Error("Thread not found");

      const updated = {
          ...threads[index],
          ...dto,
          updated_at: new Date().toISOString()
      };
      threads[index] = updated;
      storage.setItem(this.THREADS_KEY, JSON.stringify(threads));

      if (dto.tagIds) {
          let junctionData = this.getThreadTagsData();
          junctionData = junctionData.filter(j => j.thread_id !== id);
          dto.tagIds.forEach(tagId => {
              junctionData.push({ thread_id: id, tag_id: tagId });
          });
          storage.setItem(this.THREAD_TAGS_KEY, JSON.stringify(junctionData));
      }

      return updated;
  }

  async deleteThread(id: string): Promise<void> {
      await new Promise(resolve => setTimeout(resolve, 400));
      const threads = this.getThreads();
      const filtered = threads.filter(t => t.id !== id);
      storage.setItem(this.THREADS_KEY, JSON.stringify(filtered));
  }
}

// --- Supabase Implementation ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    // 1. Create Thread
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility 
        })
        .select().single();
    
    if (error) throw error;

    // 2. Insert Tags (Junction) - dto.tagIds are now UUIDs
    if (dto.tagIds && dto.tagIds.length > 0) {
        const junctionInserts = dto.tagIds.map(tagId => ({
            thread_id: thread.id,
            tag_id: tagId
        }));
        const { error: tagError } = await supabase.from('thread_tags').insert(junctionInserts);
        if (tagError) console.error("Failed to link tags", tagError);
    }

    return thread as ThreadRecord;
  }

  async getAllThreads(offset = 0, limit = 10): Promise<ThreadRecord[]> {
    const { data, error } = await supabase
        .from('threads')
        .select('*, thread_replies(count)')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return (data as any[]).map(t => ({
        ...t,
        reply_count: t.thread_replies ? t.thread_replies[0]?.count || 0 : 0
    })) as ThreadRecord[];
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      // Query through the join table
      const { data, error } = await supabase
        .from('threads')
        .select('*, thread_tags!inner(tag_id, tags!inner(slug)), thread_replies(count)')
        .eq('visibility', 'public')
        .eq('thread_tags.tags.slug', tagSlug)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      return (data as any[]).map(t => ({
        ...t,
        reply_count: t.thread_replies ? t.thread_replies[0]?.count || 0 : 0
    })) as ThreadRecord[];
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
        .from('threads')
        .select('*, thread_replies(count)')
        .eq('id', id)
        .single();
    if (error) throw error;
    const thread = data as any;
    thread.reply_count = thread.thread_replies ? thread.thread_replies[0]?.count || 0 : 0;
    return thread as ThreadRecord;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('thread_tags').select('tags(*)').eq('thread_id', threadId);
    if (error) throw error;
    // @ts-ignore
    return data.map(d => d.tags) as TagRecord[];
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     const { data, error } = await supabase.from('thread_replies').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) throw error;
    return data as ThreadReplyRecord[];
  }

  async getReplyById(replyId: string): Promise<ThreadReplyRecord | null> {
      const { data, error } = await supabase.from('thread_replies').select('*').eq('id', replyId).single();
      if (error) return null;
      return data as ThreadReplyRecord;
  }

  async createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord> {
      const { data, error } = await supabase.from('thread_replies').insert({
          thread_id: threadId,
          lenser_id: lenserId,
          content,
          parent_reply_id: parentReplyId
      }).select().single();
      if (error) throw error;
      return data as ThreadReplyRecord;
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      return ['productivity', 'ai', 'design'];
  }

  async updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> {
      const { data, error } = await supabase.from('threads')
        .update({
            title: dto.title,
            content: dto.content,
            visibility: dto.visibility,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;

      if (dto.tagIds) {
          await supabase.from('thread_tags').delete().eq('thread_id', id);
          const junctionInserts = dto.tagIds.map(tagId => ({
            thread_id: id,
            tag_id: tagId
          }));
          await supabase.from('thread_tags').insert(junctionInserts);
      }

      return data as ThreadRecord;
  }

  async deleteThread(id: string): Promise<void> {
      const { error } = await supabase.from('threads').delete().eq('id', id);
      if (error) throw error;
  }
}
