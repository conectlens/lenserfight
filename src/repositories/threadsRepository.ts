
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
  private THREAD_TAGS_KEY = 'mock_thread_tags';
  private TAGS_KEY = 'mock_tags';
  private LENSERS_KEY = 'mock_lenser_'; // Partial prefix match logic needed or use index

  private getThreads(): ThreadRecord[] {
    return JSON.parse(storage.getItem(this.THREADS_KEY) || '[]');
  }

  private saveThreads(threads: ThreadRecord[]) {
    storage.setItem(this.THREADS_KEY, JSON.stringify(threads));
  }

  private getTags(): TagRecord[] {
    return JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
  }

  private getThreadTagsRelation(): { thread_id: string, tag_id: string }[] {
    return JSON.parse(storage.getItem(this.THREAD_TAGS_KEY) || '[]');
  }

  private saveThreadTagsRelation(rels: { thread_id: string, tag_id: string }[]) {
    storage.setItem(this.THREAD_TAGS_KEY, JSON.stringify(rels));
  }

  // Helper to mimic join
  private enrichThread(t: ThreadRecord) {
    const lenserJson = storage.getItem(this.LENSERS_KEY + t.lenser_id);
    // Fallback if not found in individual key, check index (simplified)
    let author: any = lenserJson ? JSON.parse(lenserJson) : { display_name: 'Unknown User', handle: 'unknown' };
    
    // Get Tags
    const allTags = this.getTags();
    const rels = this.getThreadTagsRelation();
    const myTagIds = rels.filter(r => r.thread_id === t.id).map(r => r.tag_id);
    const myTags = allTags.filter(tag => myTagIds.includes(tag.id));

    return {
      ...t,
      author: {
        id: author.id || t.lenser_id,
        display_name: author.display_name,
        handle: author.handle,
        avatar_url: author.avatar_url
      },
      thread_tags: myTags.map(tag => ({ tag }))
    };
  }

  createThread = async (dto: CreateThreadDTO): Promise<ThreadRecord> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const threads = this.getThreads();
    const newThread: ThreadRecord = {
      id: `thread-${Date.now()}`,
      lenser_id: dto.lenserId,
      title: dto.title,
      content: dto.content,
      visibility: dto.visibility,
      view_count: 0,
      reply_count: 0,
      reaction_totals: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    threads.unshift(newThread);
    this.saveThreads(threads);

    // Save Tags
    if (dto.tagIds && dto.tagIds.length > 0) {
      const rels = this.getThreadTagsRelation();
      dto.tagIds.forEach(tagId => {
        rels.push({ thread_id: newThread.id, tag_id: tagId });
      });
      this.saveThreadTagsRelation(rels);
    }

    return newThread;
  };

  getAllThreads = async (offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const threads = this.getThreads().filter(t => t.visibility === 'public');
    const sliced = threads.slice(offset, offset + limit);
    return sliced.map(t => this.enrichThread(t));
  };

  getThreadsByTag = async (tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const allTags = this.getTags();
    const targetTag = allTags.find(t => t.slug === tagSlug);
    
    if (!targetTag) return [];

    const rels = this.getThreadTagsRelation();
    const threadIds = rels.filter(r => r.tag_id === targetTag.id).map(r => r.thread_id);
    
    const threads = this.getThreads().filter(t => threadIds.includes(t.id) && t.visibility === 'public');
    // Sort desc by date
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return threads.slice(offset, offset + limit).map(t => this.enrichThread(t));
  };

  getThreadById = async (id: string): Promise<ThreadRecord | null> => {
    const t = this.getThreads().find(th => th.id === id);
    return t ? this.enrichThread(t) : null;
  };

  getThreadTags = async (threadId: string): Promise<TagRecord[]> => {
    const allTags = this.getTags();
    const rels = this.getThreadTagsRelation();
    const ids = rels.filter(r => r.thread_id === threadId).map(r => r.tag_id);
    return allTags.filter(t => ids.includes(t.id));
  };

  getThreadReplies = async (threadId: string): Promise<ThreadReplyRecord[]> => {
    // Stub
    return []; 
  };
  getReplyById = async (replyId: string) => null;
  getTrendingTags = async (limit: number) => {
      // Basic mock trending: count occurrences in junction
      const rels = this.getThreadTagsRelation();
      const allTags = this.getTags();
      const counts: Record<string, number> = {};
      
      rels.forEach(r => { counts[r.tag_id] = (counts[r.tag_id] || 0) + 1; });
      
      const sortedTagIds = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, limit);
      return sortedTagIds.map(id => allTags.find(t => t.id === id)?.name || '').filter(Boolean);
  };
  createReply = async () => ({} as any);
  updateThread = async (id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> => {
      // Basic update stub
      const threads = this.getThreads();
      const idx = threads.findIndex(t => t.id === id);
      if (idx === -1) throw new Error("Not found");
      const updated = { ...threads[idx], ...dto, updated_at: new Date().toISOString() };
      // Omit dealing with tag updates in mock for brevity unless needed
      threads[idx] = updated as any; 
      this.saveThreads(threads);
      return updated as any;
  };
  deleteThread = async (id: string) => {
      const threads = this.getThreads().filter(t => t.id !== id);
      this.saveThreads(threads);
  };
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

      if (error) {
          // Gracefully handle Supabase error 42803 (aggregate functions in view)
          if (error.code === '42803') {
              console.warn("SupabaseThreadsRepository: 42803 error on tag filter, returning empty.", error);
              return [];
          }
          throw error;
      }
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
