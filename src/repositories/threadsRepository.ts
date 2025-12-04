
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

  createThread = async (dto: CreateThreadDTO): Promise<ThreadRecord> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const threads = this.getThreads();
    const allTags = this.getTags();
    
    // 1. Bake the profile in at creation time (Denormalization)
    const authorProfile = this.getAuthorProfile(dto.lenserId);

    // 2. Resolve Tags (Denormalization)
    const threadTags = dto.tagIds ? allTags.filter(t => dto.tagIds.includes(t.id)) : [];

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
      tags: threadTags, // Stored directly
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    threads.unshift(newThread);
    this.saveThreads(threads);

    // 3. Maintain Junction Table for referential integrity simulation
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
    // Fast read: No joins, just filter and slice
    const threads = this.getThreads()
        .filter(t => t.visibility === 'public')
        .slice(offset, offset + limit);
    return threads;
  };

  getThreadsByTag = async (tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Read from the denormalized 'tags' column directly
    const threads = this.getThreads()
        .filter(t => t.visibility === 'public' && t.tags && t.tags.some(tag => tag.slug === tagSlug))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return threads.slice(offset, offset + limit);
  };

  getThreadById = async (id: string): Promise<ThreadRecord | null> => {
    const t = this.getThreads().find(th => th.id === id);
    return t || null;
  };

  getByAuthor = async (lenserId: string, offset = 0, limit = 10, includePrivate = false): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    let threads = this.getThreads().filter(t => t.lenser_id === lenserId);
    if (!includePrivate) {
        threads = threads.filter(t => t.visibility === 'public');
    }
    threads.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return threads.slice(offset, offset + limit);
  };

  getThreadTags = async (threadId: string): Promise<TagRecord[]> => {
    // Read from cached field
    const thread = this.getThreads().find(t => t.id === threadId);
    return thread?.tags || [];
  };

  getThreadReplies = async (threadId: string): Promise<ThreadReplyRecord[]> => {
    // Mock replies are not persisted in full DB logic in this minimal mock, 
    // but typically would be separate. For now returning empty or stored replies if any.
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
      
      const allTags = this.getTags();
      const newTags = dto.tagIds ? allTags.filter(t => dto.tagIds!.includes(t.id)) : threads[idx].tags;

      const updated = { 
          ...threads[idx], 
          ...dto, 
          tags: newTags, // Update denormalized column
          updated_at: new Date().toISOString() 
      };
      
      // @ts-ignore
      threads[idx] = updated; 
      this.saveThreads(threads);
      return updated as any;
  };
  
  deleteThread = async (id: string) => {
      const threads = this.getThreads().filter(t => t.id !== id);
      this.saveThreads(threads);
  };
  incrementView = async () => {};
}

// --- Supabase Implementation (Optimized for Denormalization) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  // Single-Query Read using denormalized columns
  private get threadSelect() {
    return '*'; // We select * because tags, reaction_totals, and author_profile are now columns on the table
  }

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    // The DB trigger `trg_populate_thread_author` handles author_profile population
    // The DB trigger `trg_thread_tags_sync` handles tags population after insertion into junction
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility,
            reaction_totals: {},
            tags: [] // Initial empty, trigger populates
        })
        .select() 
        .single();
    
    if (error) throw error;

    // Insert tags into junction table, DB triggers will update the `threads.tags` JSONB
    if (dto.tagIds && dto.tagIds.length > 0) {
        const junctionInserts = dto.tagIds.map(tagId => ({
            thread_id: thread.id,
            tag_id: tagId
        }));
        await supabase.from('thread_tags').insert(junctionInserts);
        
        // Fetch fresh to get the populated tags
        const { data: freshThread } = await supabase.from('threads').select('*').eq('id', thread.id).single();
        return freshThread as ThreadRecord;
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
    return data as ThreadRecord[];
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      // Use the @> operator to check if JSONB array contains a tag with the slug
      const { data, error } = await supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('visibility', 'public')
        .contains('tags', JSON.stringify([{ slug: tagSlug }])) // Assumes array of objects structure
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
          // Fallback to legacy join if JSONB query fails or index missing
          console.warn("JSONB tag query failed, falling back", error);
          return [];
      }
      return data as ThreadRecord[];
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
        .from('threads')
        .select(this.threadSelect)
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data as ThreadRecord;
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
    return data as ThreadRecord[];
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    // Read from the cached column
    const { data } = await supabase.from('threads').select('tags').eq('id', threadId).single();
    return (data?.tags as TagRecord[]) || [];
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
      const { data } = await supabase
        .from('tags')
        .select('name')
        .order('count', { ascending: false, foreignTable: 'thread_tags' } as any) // Assuming we added count to tags too, else fall back
        .limit(limit);
      
      // Fallback to simple RPC or client sort if complex
      return [];
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
