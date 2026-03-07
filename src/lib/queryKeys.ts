export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    feed: () => [...queryKeys.threads.all, 'feed'] as const,
    detail: (id: string) => [...queryKeys.threads.all, 'detail', id] as const,
  },
  prompts: {
    all: ['prompts'] as const,
    feed: (filter?: object) => [...queryKeys.prompts.all, 'feed', filter] as const,
    top: ['prompts', 'top'] as const,
    detail: (id: string) => [...queryKeys.prompts.all, 'detail', id] as const,
    composite: (id: string) => [...queryKeys.prompts.all, 'composite', id] as const,
  },
  lenser: {
    all: ['lenser'] as const,
    profile: (handle: string) => [...queryKeys.lenser.all, 'profile', handle] as const,
    authenticated: () => [...queryKeys.lenser.all, 'authenticated'] as const,
    xp: (id: string) => [...queryKeys.lenser.all, 'xp', id] as const,
    stats: (handle: string) => [...queryKeys.lenser.all, 'stats', handle] as const,
    activity: (handle: string) => [...queryKeys.lenser.all, 'activity', handle] as const,
    latest: ['lenser', 'latest'] as const,
  },
  tags: {
    all: ['tags'] as const,
    trending: ['tags', 'trending'] as const,
    detail: (slug: string) => [...queryKeys.tags.all, 'detail', slug] as const,
    prompts: (slug: string, sort?: string) => [...queryKeys.tags.all, 'prompts', slug, sort] as const,
    threadList: (slug: string, sort?: string) => [...queryKeys.tags.all, 'threads', slug, sort] as const,
  },
  xp: {
    all: ['xp'] as const,
    leaderboard: (timeframe: string, scope: string) => [...queryKeys.xp.all, 'leaderboard', timeframe, scope] as const,
    self: () => [...queryKeys.xp.all, 'self'] as const,
  },
  feedbacks: {
    all: ['feedbacks'] as const,
    list: (userId?: string, page?: number) => [...queryKeys.feedbacks.all, userId, page] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: (page?: number, search?: string) => [...queryKeys.admin.all, 'users', page, search] as const,
    waitlist: (page?: number) => [...queryKeys.admin.all, 'waitlist', page] as const,
    contacts: (page?: number) => [...queryKeys.admin.all, 'contacts', page] as const,
    feedbacks: (page?: number, filter?: string) => [...queryKeys.admin.all, 'feedbacks', page, filter] as const,
  },
  waitingList: {
    all: ['waitingList'] as const,
    status: () => [...queryKeys.waitingList.all, 'status'] as const,
  },
}
