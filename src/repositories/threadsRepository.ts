import { ThreadRecord, TagRecord, ThreadReplyRecord, CreateThreadDTO } from '../types/threads.types';
import { supabase } from '../utils/supabase';

// --- Port (Interface) ---
export interface ThreadsRepositoryPort {
  createThread(dto: CreateThreadDTO): Promise<ThreadRecord>;
  getAllThreads(): Promise<ThreadRecord[]>;
  getThreadById(id: string): Promise<ThreadRecord | null>;
  getThreadTags(threadId: string): Promise<TagRecord[]>;
  getThreadReactionCount(threadId: string): Promise<number>;
  getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]>;
  getTrendingTags(limit: number): Promise<string[]>;
}

// --- Mock Implementation ---
export class MockThreadsRepository implements ThreadsRepositoryPort {
  
  // In-memory storage for the session
  private threads: ThreadRecord[] = [
    {
      id: 'thread-1',
      lenser_id: 'lenser-1',
      title: 'Mastering a Minimalist Digital Toolkit for Enhanced Focus',
      content: "The key to a productive and creative workflow lies not in the multitude of tools, but in the mastery of a few. How do you all approach minimizing your digital toolkit to enhance focus and reduce cognitive load? I've been experimenting with a single note-taking app and a focused task manager, and the clarity has been remarkable. Looking for principles, strategies, and app recommendations that align with a minimalist philosophy.",
      visibility: 'public',
      view_count: 120,
      reply_count: 5,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      updated_at: new Date().toISOString(),
      prompt_data: {
        title: "The One-App Challenge",
        description: "For one week, try to manage all your tasks, notes, and reminders using a single, versatile application. Document your experience, noting the benefits and drawbacks of this consolidated approach.",
        actionLabel: "View Prompt"
      }
    },
    {
      id: 'thread-2',
      lenser_id: 'lenser-2',
      title: 'Learnings from a Week of Digital Detox',
      content: "I unplugged completely for 7 days. The results were not what I expected at all, and it completely changed my perspective on work-life balance and the role of technology in my daily routines.",
      visibility: 'public',
      view_count: 340,
      reply_count: 12,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), // 8 hours ago
      updated_at: new Date().toISOString(),
    },
    {
      id: 'thread-3',
      lenser_id: 'lenser-1',
      title: 'The Future of Remote Work Tools',
      content: "As we move into 2025, the landscape of collaboration tools is shifting. Here are my top 5 predictions for what will stick and what will fade away.",
      visibility: 'public',
      view_count: 85,
      reply_count: 2,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      updated_at: new Date().toISOString(),
    }
  ];

  // Mock tags association map
  private threadTags: Record<string, TagRecord[]> = {};

  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    await new Promise(resolve => setTimeout(resolve, 800));

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

    this.threads.unshift(newThread);

    if (dto.tagIds.length > 0) {
      this.threadTags[newThread.id] = dto.tagIds.map((tag, index) => ({
        id: `tag-${Date.now()}-${index}`,
        name: tag,
        slug: tag.toLowerCase().replace(/\s+/g, '-'),
        created_at: new Date().toISOString()
      }));
    }

    return newThread;
  }

  async getAllThreads(): Promise<ThreadRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    // Filter strictly for public threads for the feed
    return this.threads.filter(t => t.visibility === 'public');
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const all = this.threads; // Can access private via ID in this simplified mock
    return all.find(t => t.id === id) || null;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.threadTags[threadId]) {
      return this.threadTags[threadId];
    }

    if (threadId === 'thread-1') {
      return [
        { id: 'tag-1', slug: 'productivity', name: 'Productivity', created_at: '' },
        { id: 'tag-2', slug: 'uiux', name: 'UI/UX', created_at: '' },
        { id: 'tag-3', slug: 'research', name: 'Research', created_at: '' },
      ];
    }
    if (threadId === 'thread-2') {
      return [
        { id: 'tag-4', slug: 'mindfulness', name: 'Mindfulness', created_at: '' },
        { id: 'tag-5', slug: 'habits', name: 'Habits', created_at: '' },
      ];
    }
    return [{ id: 'tag-6', slug: 'tech', name: 'Tech', created_at: '' }];
  }

  async getThreadReactionCount(threadId: string): Promise<number> {
    await new Promise(resolve => setTimeout(resolve, 50));
    if (threadId === 'thread-1') return 128;
    if (threadId === 'thread-2') return 142;
    if (this.threads.find(t => t.id === threadId)) return 0;
    return 15;
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (threadId === 'thread-1') {
      return [
        {
          id: 'reply-1',
          thread_id: 'thread-1',
          lenser_id: 'lenser-seneca',
          content: "An excellent point. I find that time-blocking and disabling all non-essential notifications are the most effective strategies. The tool itself is secondary to the discipline of its use.",
          reaction_count: 45,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString() 
        },
        {
          id: 'reply-2',
          thread_id: 'thread-1',
          lenser_id: 'lenser-epictetus',
          content: "Agreed. The focus should be on principles, not products. The best tool is the one that disappears, allowing the work to come to the forefront. I use plain text files and a simple folder structure; it's foolproof and timeless.",
          reaction_count: 82,
          created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString() 
        }
      ];
    }
    return [];
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      await new Promise(resolve => setTimeout(resolve, 200));
      return ['focus', 'deepwork', 'journaling', 'systems', 'health', 'uiux', 'minimalism'];
  }
}

// --- Supabase Implementation (Stub) ---
export class SupabaseThreadsRepository implements ThreadsRepositoryPort {
  
  async createThread(dto: CreateThreadDTO): Promise<ThreadRecord> {
    const { data, error } = await supabase.from('threads').insert({ lenser_id: dto.lenserId, title: dto.title, content: dto.content, visibility: dto.visibility }).select().single();
    if (error) throw error;
    return data as ThreadRecord;
  }

  async getAllThreads(): Promise<ThreadRecord[]> {
    // Filter strictly for public threads
    const { data, error } = await supabase.from('threads').select('*').eq('visibility', 'public').order('created_at', { ascending: false });
    if (error) throw error;
    return data as ThreadRecord[];
  }

  async getThreadById(id: string): Promise<ThreadRecord | null> {
    const { data, error } = await supabase.from('threads').select('*').eq('id', id).single();
    if (error) throw error;
    return data as ThreadRecord;
  }

  async getThreadTags(threadId: string): Promise<TagRecord[]> {
    const { data, error } = await supabase.from('thread_tags').select('tags(*)').eq('thread_id', threadId);
    if (error) throw error;
    // @ts-ignore
    return data.map(d => d.tags) as TagRecord[];
  }

  async getThreadReactionCount(threadId: string): Promise<number> {
    const { count, error } = await supabase.from('thread_reactions').select('*', { count: 'exact', head: true }).eq('thread_id', threadId);
    if (error) throw error;
    return count || 0;
  }

  async getThreadReplies(threadId: string): Promise<ThreadReplyRecord[]> {
     const { data, error } = await supabase.from('thread_replies').select('*').eq('thread_id', threadId).order('created_at', { ascending: true });
    if (error) throw error;
    return data as ThreadReplyRecord[];
  }

  async getTrendingTags(limit: number): Promise<string[]> {
      // Very naive implementation
      return ['productivity', 'ai', 'design'];
  }
}