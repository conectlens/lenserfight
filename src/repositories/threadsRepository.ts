
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
              reaction_totals: { like: 12, love: 4 },
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
              updated_at: new Date().toISOString(),
            }
        ];
        storage.setItem(this.THREADS_KEY, JSON.stringify(initialThreads));
    }

    if (!storage.getItem(this.THREAD_TAGS_KEY)) {
        const tags = [
            { thread_id: 'thread-1', tag_id: 'tag-0' },
            { thread_id: 'thread-1', tag_id: 'tag-1' }
        ];
        storage.setItem(this.THREAD_TAGS_KEY, JSON.stringify(tags));
    }
  }

  private getThreads(): ThreadRecord[] {
      return JSON.parse(storage.getItem(this.THREADS_KEY) || '[]');
  }

  private saveThreads(threads: ThreadRecord[]) {
      storage.setItem(this.THREADS_KEY, JSON.stringify(threads));
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
      reaction_totals: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const threads = this.getThreads();
    threads.unshift(newThread);
    this.saveThreads(threads);

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
    // Strictly filter public threads for global lists
    return this.getThreads()
        .filter(t => t.visibility === 'public')
        .slice(offset, offset + limit);
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
      const tag = allTags.find((t: any) => t.slug === tagSlug);
      if (!tag) return [];

      const junctionData = this.getThreadTagsData();
      const threadIds = junctionData.filter(j => j.tag_id === tag.id).map(j => j.thread_id);

      const filtered = this.getThreads()
        .filter(t => threadIds.includes(t.id) && t.visibility === 'public');
      
      return filtered.slice(offset, offset + limit);
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    return this.getThreads().find(t => t.id === id) || null;
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
          reaction_totals: {},
          created_at: new Date().toISOString()
      };
      
      // Save Reply
      const replies = this.getReplies();
      replies.push(newReply);
      storage.setItem(this.REPLIES_KEY, JSON.stringify(replies));

      // Simulate Trigger: Increment reply_count on Thread
      const threads = this.getThreads();
      const threadIndex = threads.findIndex(t => t.id === threadId);
      if (threadIndex !== -1) {
          threads[threadIndex].reply_count = (threads[threadIndex].reply_count || 0) + 1;
          this.saveThreads(threads);
      }
      
      return newReply;
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      await new Promise(resolve => setTimeout(resolve, 400));
      const threads = this.getThreads();
      const threadTags = this.getThreadTagsData();
      const allTags = JSON.parse(storage.getItem(this.TAGS_KEY) || '[]');
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const activeThreadIds = threads
        .filter(t => t.visibility === 'public' && new Date(t.created_at) > oneWeekAgo)
        .map(t => t.id);

      const counts: Record<string, number> = {};
      threadTags.forEach(tt => {
          if (activeThreadIds.includes(tt.thread_id)) {
              counts[tt.tag_id] = (counts[tt.tag_id] || 0) + 1;
          }
      });

      const sortedTagIds = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
      return sortedTagIds.slice(0, limit).map(id => {
          const t = allTags.find((tag: any) => tag.id === id);
          return t ? t.name : null;
      }).filter((n): n is string => n !== null);
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
      this.saveThreads(threads);

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
      this.saveThreads(filtered);
  }

  async incrementView(id: string): Promise<void> {
      // Simulate RPC
      const threads = this.getThreads();
      const t = threads.find(thread => thread.id === id);
      if (t) {
          t.view_count = (t.view_count || 0) + 1;
          this.saveThreads(threads);
      }
  }
}

// --- Supabase Implementation ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility 
        })
        .select().single();
    
    if (error) throw error;

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
    // Strictly filter public threads
    const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
    if (error) throw error;
    return data as ThreadRecord[];
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      const { data, error } = await supabase
        .from('threads')
        .select('*, thread_tags!inner(tag_id, tags!inner(slug))')
        .eq('visibility', 'public')
        .eq('thread_tags.tags.slug', tagSlug)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data as ThreadRecord[];
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data as ThreadRecord;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('thread_tags').select('tags(*)').eq('thread_id', threadId);
    if (error) throw error;
    // @ts-ignore
    return data.map(d => d.tags) as TagRecord[];
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     const { data, error } = await supabase
        .from('thread_replies')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });
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
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('thread_tags')
        .select(`
            tag_id,
            threads!inner (
                created_at,
                visibility
            )
        `)
        .eq('threads.visibility', 'public')
        .gt('threads.created_at', oneWeekAgo.toISOString());

      if (error) {
          console.error("Failed to fetch trending tags", error);
          return [];
      }

      if (!data || data.length === 0) return [];

      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
          counts[item.tag_id] = (counts[item.tag_id] || 0) + 1;
      });

      const topIds = Object.keys(counts)
        .sort((a, b) => counts[b] - counts[a])
        .slice(0, limit);

      if (topIds.length === 0) return [];

      const { data: tags, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .in('id', topIds);

      if (tagsError) return [];

      const idToName = new Map(tags.map((t: any) => [t.id, t.name]));
      return topIds.map(id => idToName.get(id)).filter((n): n is string => !!n);
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

  async incrementView(id: string): Promise<void> {
      const { error } = await supabase.rpc('increment_thread_view', { p_thread_id: id });
      if (error) console.error("Failed to increment view", error);
  }
}
