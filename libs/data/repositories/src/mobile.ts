import { supabase } from '@lenserfight/data/supabase'
import type {
  CreateLenserDTO,
  LensDetailViewModel,
  LensViewModel,
  Lenser,
  TagUsage,
  ThreadDetailViewModel,
  ThreadFeedItem,
  User,
  UserMetadata,
} from '@lenserfight/types'
import { SupabaseAuthRepository, type MobileOAuthProvider } from './lib/repositories/authRepository'

export type MobileBattle = {
  id: string
  title: string
  status: string
  battleType: string
  lensId: string | null
  createdAt: string
  scheduledStart: string | null
  scheduledEnd: string | null
}

const authRepo = new SupabaseAuthRepository()

type Envelope<T> = {
  data: T
  meta: { limit: number; offset: number; hasNextPage: boolean }
}

type AuthorProfile = {
  id?: string
  handle?: string
  display_name?: string
  avatar_url?: string | null
}

const mapAuthor = (record: { lenser_id?: string | null; author_profile?: AuthorProfile | null }) => ({
  id: record.author_profile?.id ?? record.lenser_id ?? 'unknown',
  handle: record.author_profile?.handle ?? 'unknown',
  displayName: record.author_profile?.display_name ?? 'Unknown',
  avatarUrl: record.author_profile?.avatar_url ?? null,
})

const reactionTotal = (totals?: Record<string, number> | null): number =>
  Object.values(totals ?? {}).reduce((sum, value) => sum + Number(value ?? 0), 0)

const mapThread = (record: any): ThreadFeedItem => ({
  id: record.id,
  author: mapAuthor(record),
  title: record.title ?? 'Untitled',
  content: record.content ?? '',
  tags: record.tags ?? [],
  reactionCount: reactionTotal(record.reaction_totals),
  replyCount: Number(record.reply_count ?? 0),
  createdAt: record.created_at,
  userHasReacted: false,
  visibility: record.visibility ?? 'public',
  status: record.status ?? 'active',
})

const mapLens = (record: any): LensViewModel => ({
  id: record.id,
  title: record.title ?? 'Untitled',
  description: record.description ?? '',
  usageCount: Number(record.reaction_totals?.copy ?? 0),
  createdAt: record.created_at,
  visibility: record.visibility ?? 'public',
  status: record.status ?? 'active',
  author: mapAuthor(record),
  tags: record.tags ?? [],
})

const envelope = <T,>(data: T[], limit: number, offset: number): Envelope<T[]> => ({
  data,
  meta: { limit, offset, hasNextPage: data.length >= limit },
})

const raisePublicError = (error: unknown, message: string) => {
  if (error) throw new Error(message)
}

export const authService = {
  login: (email: string, password: string, captchaToken?: string): Promise<User> =>
    authRepo.login(email, password, captchaToken),
  register: (
    email: string,
    password: string,
    metadata?: UserMetadata,
    captchaToken?: string
  ): Promise<User> => authRepo.register(email, password, metadata, captchaToken),
  logout: (): Promise<void> => authRepo.logout(),
  getCurrentUser: (): Promise<User | null> => authRepo.getCurrentUser(),
  updateMetadata: (metadata: Partial<UserMetadata>): Promise<void> =>
    authRepo.updateMetadata(metadata),
  requestPasswordReset: (email: string, captchaToken?: string): Promise<void> =>
    authRepo.requestPasswordReset(email, captchaToken),
  resetPassword: (password: string): Promise<void> => authRepo.resetPassword(password),
  signInWithOAuth: (provider: MobileOAuthProvider): Promise<void> =>
    authRepo.signInWithOAuth(provider),
  resendSignupConfirmation: (email: string): Promise<void> =>
    authRepo.resendSignupConfirmation(email),
  sendMagicLink: (email: string, captchaToken?: string): Promise<void> =>
    authRepo.sendMagicLink(email, captchaToken),
  onAuthStateChange: authRepo.onAuthStateChange.bind(authRepo),
  resolveHandleToEmail: (handle: string): Promise<string | null> =>
    authRepo.resolveHandleToEmail(handle),
}

export const lenserService = {
  async getAuthenticatedLenser(): Promise<Lenser | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase.rpc('fn_lensers_get_active_profile')
    if (error || !data) return null
    const row = Array.isArray(data) ? data[0] : data
    return (row ?? null) as Lenser | null
  },

  async createLenserProfile(data: CreateLenserDTO): Promise<Lenser> {
    const { data: created, error } = await supabase.rpc('fn_lensers_create_profile', {
      p_handle: data.handle,
      p_display_name: data.display_name,
      p_bio: data.bio || '',
    })
    raisePublicError(error, 'Could not create profile.')
    return created as Lenser
  },

  async updateLenserProfile(data: Partial<Lenser>): Promise<Lenser> {
    const { data: updated, error } = await supabase.rpc('fn_lensers_update_profile', {
      p_data: data,
    })
    raisePublicError(error, 'Could not update profile.')
    return updated as Lenser
  },
}

export const threadsService = {
  async getThreadsFeed(
    _currentUserId?: string,
    offset = 0,
    limit = 20
  ): Promise<Envelope<ThreadFeedItem[]>> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select('id,title,content,lenser_id,author_profile,tags,reaction_totals,reply_count,visibility,status,created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    raisePublicError(error, 'Could not load threads.')
    return envelope((data ?? []).map(mapThread), limit, offset)
  },

  async getThreadDetail(threadId: string): Promise<ThreadDetailViewModel | null> {
    const { data, error } = await supabase
      .from('vw_content_threads_public')
      .select('id,title,content,lenser_id,author_profile,tags,reaction_totals,reply_count,visibility,status,created_at,prompt_data')
      .eq('id', threadId)
      .maybeSingle()
    raisePublicError(error, 'Could not load thread.')
    if (!data) return null
    const item = mapThread(data)
    return {
      ...item,
      replies: [],
      repliesHasNextPage: false,
      promptBlock: data.prompt_data ?? null,
    }
  },

  async getThreadsByTag(
    slug: string,
    _sort = 'newest',
    _currentUserId?: string,
    offset = 0,
    limit = 10
  ): Promise<Envelope<ThreadFeedItem[]>> {
    const { data, error } = await supabase.rpc('fn_content_get_threads_by_tag', {
      p_tag_slug: slug,
      p_sort: 'newest',
      p_offset: offset,
      p_limit: limit,
    })
    raisePublicError(error, 'Could not load tagged threads.')
    return envelope((data ?? []).map(mapThread), limit, offset)
  },
}

export const lensesService = {
  async getLenses(offset = 0, limit = 20): Promise<Envelope<LensViewModel[]>> {
    const { data, error } = await supabase
      .from('vw_lenses_public')
      .select('id,title,description,lenser_id,author_profile,tags,reaction_totals,visibility,status,created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    raisePublicError(error, 'Could not load lenses.')
    return envelope((data ?? []).map(mapLens), limit, offset)
  },

  async getLensDetail(id: string): Promise<LensDetailViewModel | null> {
    const { data, error } = await supabase.from('vw_lenses_public').select('*').eq('id', id).maybeSingle()
    raisePublicError(error, 'Could not load lens.')
    if (!data) return null
    const item = mapLens(data)
    return {
      ...item,
      content: data.content ?? '',
      reactionCounts: {
        like: Number(data.reaction_totals?.like ?? 0),
        love: Number(data.reaction_totals?.love ?? 0),
        clap: Number(data.reaction_totals?.clap ?? 0),
        saved: Number(data.reaction_totals?.saved ?? 0),
        copy: Number(data.reaction_totals?.copy ?? 0),
      },
      isSaved: false,
      parentLensId: data.parent_lens_id ?? null,
      forkedFromExecutionId: data.forked_from_execution_id ?? null,
      params: data.params ?? [],
      latestVersionId: data.head_version_id ?? null,
      latestPublishedVersion: null,
    }
  },

  async filter(tagSlug: string | null, offset = 0, limit = 10): Promise<Envelope<LensViewModel[]>> {
    if (!tagSlug) return this.getLenses(offset, limit)
    const { data, error } = await supabase.rpc('fn_content_get_lenses_by_tag', {
      p_tag_slug: tagSlug,
      p_sort: 'newest',
      p_offset: offset,
      p_limit: limit,
    })
    raisePublicError(error, 'Could not load tagged lenses.')
    return envelope((data ?? []).map(mapLens), limit, offset)
  },
}

export const battlesService = {
  async listBattles(offset = 0, limit = 20): Promise<MobileBattle[]> {
    const { data, error } = await supabase
      .from('battles')
      .select('id,title,status,battle_type,lens_id,created_at,scheduled_start,scheduled_end')
      .in('status', ['pending', 'active', 'voting', 'judging', 'completed'])
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    raisePublicError(error, 'Could not load battles.')
    return (data ?? []).map((b: any) => ({
      id: b.id,
      title: b.title ?? 'Untitled',
      status: b.status ?? 'pending',
      battleType: b.battle_type ?? 'standard',
      lensId: b.lens_id ?? null,
      createdAt: b.created_at,
      scheduledStart: b.scheduled_start ?? null,
      scheduledEnd: b.scheduled_end ?? null,
    }))
  },

  async getBattle(id: string): Promise<MobileBattle | null> {
    const { data, error } = await supabase
      .from('battles')
      .select('id,title,status,battle_type,lens_id,created_at,scheduled_start,scheduled_end')
      .eq('id', id)
      .maybeSingle()
    raisePublicError(error, 'Could not load battle.')
    if (!data) return null
    return {
      id: data.id,
      title: data.title ?? 'Untitled',
      status: data.status ?? 'pending',
      battleType: data.battle_type ?? 'standard',
      lensId: data.lens_id ?? null,
      createdAt: data.created_at,
      scheduledStart: data.scheduled_start ?? null,
      scheduledEnd: data.scheduled_end ?? null,
    }
  },
}

export const tagService = {
  async getCloud(): Promise<TagUsage[]> {
    const { data, error } = await supabase.rpc('fn_tags_get_cloud', { p_limit: 20 })
    raisePublicError(error, 'Could not load rays.')
    return (data ?? []).map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      description: tag.description ?? '',
      visibility: tag.visibility ?? 'public',
      created_at: tag.created_at,
      count: Number(tag.total_usage ?? 0),
      trendingScore: Number(tag.trend_score_7d ?? 0),
    }))
  },

  async getTagDetails(slug: string): Promise<TagUsage | null> {
    const { data, error } = await supabase
      .from('vw_tags_public_stats')
      .select('id,name,slug,description,visibility,total_usage,trend_score_7d,created_at')
      .eq('slug', slug)
      .maybeSingle()
    raisePublicError(error, 'Could not load ray.')
    if (!data) return null
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      description: data.description ?? '',
      visibility: data.visibility ?? 'public',
      created_at: data.created_at,
      count: Number(data.total_usage ?? 0),
      trendingScore: Number(data.trend_score_7d ?? 0),
    }
  },
}
