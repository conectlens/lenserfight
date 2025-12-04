
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

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
  incrementView(id: string): Promise<void>;
}

// --- Mock Implementation ---
export class MockThreadsRepository implements ThreadsRepositoryPort {
  private THREADS_KEY = 'mock_threads_db';
  createThread = async (dto: any) => ({ ...dto, id: 'mock', created_at: new Date().toISOString() });
  getAllThreads = async () => [];
  getThreadsByTag = async () => [];
  getThreadById = async () => null;
  getThreadTags = async () => [];
  getThreadReplies = async () => [];
  getReplyById = async () => null;
  getTrendingTags = async () => [];
  createReply = async () => ({} as any);
  updateThread = async () => ({} as any);
  deleteThread = async () => {};
  incrementView = async () => {};
}

// --- Supabase Implementation (Optimized) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  // Optimized Selection: Fetches Thread + Author + Tags in one go.
  // Note: We rely on reaction_totals JSONB column for counts to avoid expensive count(*) joins.
  private get threadSelect() {
    return `
      *,
      author:lensers!lenser_id (
        id, display_name, handle, avatar_url
      ),
      thread_tags (
        tag:tags (
          id, name, slug
        )
      )
    `;
  }

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility,
            reaction_totals: {} // Initialize
        })
        .select().single();
    
    if (error) throw error;

    if (dto.tagIds && dto.tagIds.length > 0) {
        const junctionInserts = dto.tagIds.map(tagId => ({
            thread_id: thread.id,
            tag_id: tagId
        }));
        await supabase.from('thread_tags').insert(junctionInserts);
    }

    return thread as ThreadRecord;
  }

  async getAllThreads(offset = 0, limit = 10): Promise<ThreadRecord[]> {
    const { data, error } = await supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) throw error;
    return data as any;
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      const { data, error } = await supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('visibility', 'public')
        .eq('thread_tags.tags.slug', tagSlug)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data as any;
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data as any;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data } = await supabase.from('thread_tags').select('tags(*)').eq('thread_id', threadId);
    // @ts-ignore
    return data?.map(d => d.tags) || [];
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     const { data, error } = await supabase
        .from('thread_replies')
        .select(`
            *,
            author:lensers (
                id, display_name, handle, avatar_url
            )
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data as any;
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
      const { data } = await supabase
        .from('thread_tags')
        .select('tag:tags(name)')
        .limit(50);

      if (!data) return [];
      
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
          if(item.tag?.name) counts[item.tag.name] = (counts[item.tag.name] || 0) + 1;
      });

      return Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, limit);
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
      return data as ThreadRecord;
  }

  async deleteThread(id: string): Promise<void> {
      const { error } = await supabase.from('threads').delete().eq('id', id);
      if (error) throw error;
  }

  async incrementView(id: string): Promise<void> {
      await supabase.rpc('increment_thread_view', { p_thread_id: id });
  }
}
