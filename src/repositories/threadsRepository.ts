
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
  getByLenser(handle: string, offset?: number, limit?: number, includePrivate?: boolean): Promise<ThreadRecord[]>;
  getThreadTags(threadId: string): Promise<TagRecord[]>;
  getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]>;
  getReplyById(replyId: string): Promise<ThreadReplyRecord | null>;
  getTrendingTags(limit: number): Promise<string[]>;
  createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord>;
  updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord>;
  deleteThread(id: string): Promise<void>;
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

  getByLenser = async (handle: string, offset = 0, limit = 10, includePrivate = false): Promise<ThreadRecord[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    // Filter by handle using denormalized profile
    let threads = this.getThreads().filter(t => t.author_profile?.handle === handle);
    
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
}

// --- Supabase Implementation (Optimized for Views) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  private handleError(error: any) {
    if (error.code === '42501' || error.message?.includes('permission denied')) {
        throw new Error("This thread or its associated data is private or hidden and cannot be accessed.");
    }
    throw error;
  }

  // Single-Query Read using denormalized columns from secure VIEW
  private get threadSelect() {
    return '*'; 
  }

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    // Write to base table
    const { data: thread, error } = await supabase.from('threads')
        .insert({ 
            lenser_id: dto.lenserId, 
            title: dto.title, 
            content: dto.content, 
            visibility: dto.visibility,
            reaction_totals: {}
            // tags field removed from insert payload as it doesn't exist on base table
        })
        .select() 
        .single();
    
    if (error) this.handleError(error);

    // Insert tags into junction table
    if (dto.tagIds && dto.tagIds.length > 0) {
        const junctionInserts = dto.tagIds.map(tagId => ({
            thread_id: thread.id,
            tag_id: tagId
        }));
        
        const { error: tagError } = await supabase.from('thread_tags').insert(junctionInserts);
        
        if (tagError) {
            // Handle RLS error specifically for tags (e.g. trying to attach a private tag)
            if (tagError.code === '42501') {
                console.warn("One or more tags could not be attached due to visibility restrictions.");
                // We don't block thread creation, but warn.
            } else {
                throw tagError;
            }
        }
        
        // Fetch fresh from VIEW to get the populated tags
        const { data: freshThread } = await supabase.from('vw_threads_public').select('*').eq('id', thread.id).single();
        return freshThread as ThreadRecord;
    }

    // Return view representation
    const { data: finalThread } = await supabase.from('vw_threads_public').select('*').eq('id', thread.id).single();
    return finalThread as ThreadRecord;
  }

  async getAllThreads(offset = 0, limit = 10): Promise<ThreadRecord[]> {
    // Query the secure view
    const { data, error } = await supabase
        .from('vw_threads_public')
        .select(this.threadSelect)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) this.handleError(error);
    return data as ThreadRecord[];
  }

  async getThreadsByTag(tagSlug: string, offset = 0, limit = 10): Promise<ThreadRecord[]> {
      // Use JSONB containment on the view's 'tags' column
      const { data, error } = await supabase
        .from('vw_threads_public')
        .select(this.threadSelect)
        .contains('tags', JSON.stringify([{ slug: tagSlug }])) 
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) this.handleError(error);
      return data as ThreadRecord[];
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase
        .from('vw_threads_public')
        .select(this.threadSelect)
        .eq('id', id)
        .single();
    
    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        this.handleError(error);
    }
    return data as ThreadRecord;
  }

  async getByLenser(handle: string, offset = 0, limit = 10, includePrivate = false): Promise<ThreadRecord[]> {
    let query = supabase
        .from('vw_threads_public')
        .select(this.threadSelect)
        .eq('author_profile->>handle', handle) // Use JSONB author profile handle filtering
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) this.handleError(error);
    return data as ThreadRecord[];
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('vw_threads').select('tags').eq('id', threadId).single();
    if (error) return [];
    return (data?.tags as TagRecord[]) || [];
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     const { data, error } = await supabase
        .from('vw_thread_replies')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

    if (error) this.handleError(error);
    return data as ThreadReplyRecord[];
  }

  async getReplyById(replyId: string): Promise<ThreadReplyRecord | null> {
      const { data, error } = await supabase.from('vw_thread_replies').select('*').eq('id', replyId).single();
      if (error) return null;
      return data as ThreadReplyRecord;
  }

  async createReply(threadId: string, lenserId: string, content: string, parentReplyId?: string): Promise<ThreadReplyRecord> {
      const { data, error } = await supabase.from('vw_thread_replies').insert({
          thread_id: threadId,
          lenser_id: lenserId,
          content,
          parent_reply_id: parentReplyId
      }).select().single();
      if (error) this.handleError(error);
      return data as ThreadReplyRecord;
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      const { data, error } = await supabase
        .from('vw_tags_public')
        .select('name')
        .limit(limit);
      
      if (error) return [];
      return data.map((t: any) => t.name);
  }

  async updateThread(id: string, dto: Partial<CreateThreadDTO>): Promise<ThreadRecord> {
      // Write to base table
      const { error } = await supabase.from('threads')
        .update({
            title: dto.title,
            content: dto.content,
            visibility: dto.visibility,
            updated_at: new Date().toISOString()
        })
        .eq('id', id);
      
      if (error) this.handleError(error);

      // Handle tags relation update
      if (dto.tagIds) {
          // Remove all existing tags
          const { error: deleteError } = await supabase.from('thread_tags').delete().eq('thread_id', id);
          if (deleteError) this.handleError(deleteError);

          // Add new tags if any
          if (dto.tagIds.length > 0) {
              const junctionInserts = dto.tagIds.map(tagId => ({
                  thread_id: id,
                  tag_id: tagId
              }));
              const { error: tagError } = await supabase.from('thread_tags').insert(junctionInserts);
              if (tagError) {
                  // RLS permission handling
                  if (tagError.code === '42501') {
                      throw new Error("You can only attach public tags.");
                  }
                  throw tagError;
              }
          }
      }

      // Fetch from View
      const { data } = await supabase.from('vw_threads').select('*').eq('id', id).single();
      return data as ThreadRecord;
  }

  async deleteThread(id: string): Promise<void> {
      const { error } = await supabase.from('threads').delete().eq('id', id);
      if (error) this.handleError(error);
  }
}
