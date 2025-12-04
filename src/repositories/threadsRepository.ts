
import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types';
import { AuthorProfile } from '../types/lenser.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>;
  getAllThreads(offset?: number, limit?: number): Promise<ThreadRecord[]>;
  getThreadsByTag(tagSlug: string, offset?: number, limit?: number): Promise<ThreadRecord[]>;
  getThreadById(id: string): Promise<ThreadRecord | null>;
  getByAuthor(lenserId: string, offset?: number, limit?: number, includePrivate?: boolean): Promise<ThreadRecord[]>;
  getThreadTags(threadId: string): Promise<TagRecord[]>;
  getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]>;
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>;
  getTrendingTags(limit: number): Promise<string[]>;
  createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord>;
  updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord>;
  deleteThread(id: string): Promise<void>;
  incrementView(id: string): Promise<void>;
}

// Fallback data for Mock Mode to prevent "Unknown User"
const MOCK_PROFILES: Record<string, AuthorProfile> = {
    'lenser-1': { id: 'lenser-1', handle: 'cassian.lens', display_name: 'Cassian', avatar_url: 'https://ui-avatars.com/api/?name=Cassian&background=111&color=fff' },
    'lenser-2': { id: 'lenser-2', handle: 'samantha_bee', display_name: 'Samantha Bee', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=200&q=80' },
    'lenser-3': { id: 'lenser-3', handle: 'dev_lane', display_name: 'Devon Lane', avatar_url: 'https://ui-avatars.com/api/?name=Devon&background=random' },
    'lenser-4': { id: 'lenser-4', handle: 'courtney_h', display_name: 'Courtney Henry', avatar_url: 'https://ui-avatars.com/api/?name=Courtney&background=random' }
};

// --- Mock Implementation ---
export class MockThreadsRepository implements ThreadsRepositoryPort {
  private THREADS_KEY = 'mock_threads_db';
  private THREAD_TAGS_KEY = 'mock_thread_tags';
  private TAGS_KEY = 'mock_tags';
  private INDEX_KEY = 'mock_lensers_index';

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

  // Helper to fetch profile with static fallback for better mock reliability
  private getAuthorProfile(lenserId: string): AuthorProfile {
    // 1. Try static mocks first (fastest and most reliable for seeds)
    if (MOCK_PROFILES[lenserId]) return MOCK_PROFILES[lenserId];

    // 2. Try Dynamic Index
    const indexJson = storage.getItem(this.INDEX_KEY);
    const index = indexJson ? JSON.parse(indexJson) : [];
    const author = index.find((l: any) => l.id === lenserId);
    
    if (author) {
        return {
            id: author.id,
            handle: author.handle,
            display_name: author.display_name,
            avatar_url: author.avatar_url
        };
    }
    
    // 3. Fallback
    return { id: lenserId, handle: 'unknown', display_name: 'Unknown User' };
  }

  // Self-healing mechanism for mock data missing the new field
  private enrichThread(t: ThreadRecord): ThreadRecord {
      if (!t.author_profile || t.author_profile.handle === 'unknown') {
          return { ...t, author_profile: this.getAuthorProfile(t.lenser_id) };
      }
      return { ...t, author_profile: t.author_profile };
  }

  private attachTags(t: ThreadRecord) {
    const enriched = this.enrichThread(t);
    const allTags = this.getTags();
    const rels = this.getThreadTagsRelation();
    const myTagIds = rels.filter(r => r.thread_id === enriched.id).map(r => r.tag_id);
    const myTags = allTags.filter(tag => myTagIds.includes(tag.id));

    return {
      ...enriched,
      thread_tags: myTags.map(tag => ({ tag }))
    };
  }

  createThread = async (dto: CreateThreadDTO): Promise<ThreadRecord> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const threads = this.getThreads();
    // Bake the profile in at creation time
    const authorProfile = this.getAuthorProfile(dto.lenserId);

    const newThread: ThreadRecord = {
      id: `thread-${Date.now()}`,
      lenser_id: dto.lenserId,
      author_profile: authorProfile,
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

    if (dto.tagIds && dto.tagIds.length > 0) {
      const rels = this.getThreadTagsRelation();
      dto.tagIds.forEach(tagId => {
        rels.push({ thread_id: newThread.id, tag_id: tagId });
      });
      this.saveThreadTagsRelation(rels);
    }

    return this.attachTags(newThread);
  };

  getAllThreads = async (offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const threads = this.getThreads().filter(t => t.visibility === 'public');
    const sliced = threads.slice(offset, offset + limit);
    return sliced.map(t => this.attachTags(t));
  };

  getThreadsByTag = async (tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const allTags = this.getTags();
    const targetTag = allTags.find(t => t.slug === tagSlug);
    if (!targetTag) return [];

    const rels = this.getThreadTagsRelation();
    const threadIds = rels.filter(r => r.tag_id === targetTag.id).map(r => r.thread_id);
    const threads = this.getThreads().filter(t => threadIds.includes(t.id) && t.visibility === 'public');
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return threads.slice(offset, offset + limit).map(t => this.attachTags(t));
  };

  getThreadById = async (id: string): Promise<ThreadRecord | null> => {
    const t = this.getThreads().find(th => th.id === id);
    return t ? this.attachTags(t) : null;
  };

  getByAuthor = async (lenserId: string, offset = 0, limit = 10, includePrivate = false): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let threads = this.getThreads().filter(t => t.lenser_id === lenserId);
    if (!includePrivate) {
        threads = threads.filter(t => t.visibility === 'public');
    }
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return threads.slice(offset, offset + limit).map(t => this.attachTags(t));
  };

  getThreadTags = async (threadId: string): Promise<TagRecord[]> => {
    const allTags = this.getTags();
    const rels = this.getThreadTagsRelation();
    const ids = rels.filter(r => r.thread_id === threadId).map(r => r.tag_id);
    return allTags.filter(t => ids.includes(t.id));
  };

  getThreadReplies = async (threadId: string): Promise<ThreadReplyRecord[]> => {
    // Basic mock reply implementation does not persist replies in this simple mock
    // Assuming if replies existed they would be here.
    return []; 
  };
  getReplyById = async (replyId: string) => null;
  
  createReply = async (threadId: string, lenserId: string, content: string, parentReplyId?: string) => {
      const authorProfile = this.getAuthorProfile(lenserId);
      const reply: ThreadReplyRecord = {
          id: `reply-${Date.now()}`,
          thread_id: threadId,
          lenser_id: lenserId,
          author_profile: authorProfile,
          content,
          parent_reply_id: parentReplyId,
          created_at: new Date().toISOString()
      };
      return reply;
  };

  getTrendingTags = async (limit: number) => {
      const rels = this.getThreadTagsRelation();
      const allTags = this.getTags();
      const counts: Record<string, number> = {};
      rels.forEach(r => { counts[r.tag_id] = (counts[r.tag_id] || 0) + 1; });
      const sortedTagIds = Object.keys(counts).sort((a,b) => counts[b] - counts[a]).slice(0, limit);
      return sortedTagIds.map(id => allTags.find(t => t.id === id)?.name || '').filter(Boolean);
  };

  updateThread = async (id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> => {
      const threads = this.getThreads();
      const idx = threads.findIndex(t => t.id === id);
      if (idx === -1) throw new Error("Not found");
      const updated = { ...threads[idx], ...dto, updated_at: new Date().toISOString() };
      // @ts-ignore
      threads[idx] = updated; 
      this.saveThreads(threads);
      return this.attachTags(updated as any);
  };
  
  deleteThread = async (id: string) => {
      const threads = this.getThreads().filter(t => t.id !== id);
      this.saveThreads(threads);
  };
  incrementView = async () => {};
}

// --- Supabase Implementation (Optimized with JSONB Profile) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  // Clean select without joins to 'lensers'
  private get threadSelect() {
    return `
      *,
      thread_tags (
        tag:tags (
          id, name, slug
        )
      )
    `;
  }

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    // The DB trigger `trg_populate_thread_author` handles author_profile population
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility,
            reaction_totals: {} 
        })
        .select() // Select all columns, trigger populates author_profile
        .single();
    
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
        .select(`
            *,
            thread_tags!inner (
                tag:tags!inner (
                    id, name, slug
                )
            )
        `)
        .eq('visibility', 'public')
        .eq('thread_tags.tag.slug', tagSlug)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
          if (error.code === '42803') return [];
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

  async getByAuthor(lenserId: string, offset = 0, limit = 10, includePrivate = false): Promise<ThreadRecord[]> {
    let query = supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('lenser_id', lenserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (!includePrivate) {
        query = query.eq('visibility', 'public');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as any;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data } = await supabase.from('thread_tags').select('tags(*)').eq('thread_id', threadId);
    // @ts-ignore
    return data?.map(d => d.tags) || [];
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     // No joins for author here either, author_profile is in the table
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
      // Trigger populates author_profile
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
