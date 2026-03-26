export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    feed: () => [...queryKeys.threads.all, 'feed'] as const,
    trending: (lang?: string) => [...queryKeys.threads.all, 'trending', lang] as const,
    personal: (lenserId: string) => [...queryKeys.threads.all, 'personal', lenserId] as const,
    detail: (id: string) => [...queryKeys.threads.all, 'detail', id] as const,
  },
  lenses: {
    all: ['lenses'] as const,
    feed: (filter?: object) => [...queryKeys.lenses.all, 'feed', filter] as const,
    top: ['lenses', 'top'] as const,
    trending: (lang?: string) => [...queryKeys.lenses.all, 'trending', lang] as const,
    personal: (lenserId: string) => [...queryKeys.lenses.all, 'personal', lenserId] as const,
    detail: (id: string) => [...queryKeys.lenses.all, 'detail', id] as const,
    composite: (id: string) => [...queryKeys.lenses.all, 'composite', id] as const,
    forkTree: (lensId: string) => [...queryKeys.lenses.all, 'forkTree', lensId] as const,
  },
  lenser: {
    all: ['lenser'] as const,
    profile: (handle: string) => [...queryKeys.lenser.all, 'profile', handle] as const,
    authenticated: () => [...queryKeys.lenser.all, 'authenticated'] as const,
    xp: (id: string) => [...queryKeys.lenser.all, 'xp', id] as const,
    stats: (handle: string) => [...queryKeys.lenser.all, 'stats', handle] as const,
    activity: (handle: string) => [...queryKeys.lenser.all, 'activity', handle] as const,
    latest: ['lenser', 'latest'] as const,
    trending: ['lenser', 'trending'] as const,
    suggested: (lenserId: string) => [...queryKeys.lenser.all, 'suggested', lenserId] as const,
    follows: (lenserId: string, type: string) => [...queryKeys.lenser.all, 'follows', lenserId, type] as const,
    leaderboard: (period: string) => [...queryKeys.lenser.all, 'leaderboard', period] as const,
    list: (type?: string) => [...queryKeys.lenser.all, 'list', type] as const,
    pendingRequests: () => [...queryKeys.lenser.all, 'pendingRequests'] as const,
    relationship: (handle: string) => [...queryKeys.lenser.all, 'relationship', handle] as const,
  },
  tags: {
    all: ['tags'] as const,
    trending: ['tags', 'trending'] as const,
    followed: (lenserId: string) => [...queryKeys.tags.all, 'followed', lenserId] as const,
    detail: (slug: string) => [...queryKeys.tags.all, 'detail', slug] as const,
    lenses: (slug: string, sort?: string) => [...queryKeys.tags.all, 'lenses', slug, sort] as const,
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
  executions: {
    all: ['executions'] as const,
    history: (lensId: string, offset?: number) =>
      [...queryKeys.executions.all, 'history', lensId, offset] as const,
    run: (runId: string) =>
      [...queryKeys.executions.all, 'run', runId] as const,
    artifacts: (runId: string) =>
      [...queryKeys.executions.all, 'artifacts', runId] as const,
  },
  aiModels: {
    all: ['ai-models'] as const,
  },
  wallet: {
    balance: ['wallet', 'balance'] as const,
    products: ['wallet', 'products'] as const,
  },
  lensVersions: {
    all: ['lensVersions'] as const,
    list: (lensId: string) => [...queryKeys.lensVersions.all, 'list', lensId] as const,
    listPaginated: (lensId: string, offset: number) =>
      [...queryKeys.lensVersions.all, 'listPaginated', lensId, offset] as const,
    detail: (versionId: string) => [...queryKeys.lensVersions.all, 'detail', versionId] as const,
    latestPublished: (lensId: string) => [...queryKeys.lensVersions.all, 'latestPublished', lensId] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    myKeys: () => [...queryKeys.apiKeys.all, 'mine'] as const,
  },
  /** @deprecated Use queryKeys.media instead */
  resources: {
    all: ['resources'] as const,
    byOwner: (lenserId: string) => [...queryKeys.resources.all, 'owner', lenserId] as const,
    forVersion: (versionId: string) => [...queryKeys.resources.all, 'version', versionId] as const,
  },
  media: {
    all: ['media'] as const,
    byOwner: (lenserId: string) => [...queryKeys.media.all, 'owner', lenserId] as const,
    forEntity: (entityType: string, entityId: string) =>
      [...queryKeys.media.all, 'entity', entityType, entityId] as const,
  },
  battles: {
    all: ['battles'] as const,
    feed: (filter?: string) => [...queryKeys.battles.all, 'feed', filter] as const,
    detail: (slug: string) => [...queryKeys.battles.all, 'detail', slug] as const,
    contenders: (battleId: string) => [...queryKeys.battles.all, 'contenders', battleId] as const,
    aggregates: (battleId: string) => [...queryKeys.battles.all, 'aggregates', battleId] as const,
    scorecard: (battleId: string) => [...queryKeys.battles.all, 'scorecard', battleId] as const,
    comments: (battleId: string) => [...queryKeys.battles.all, 'comments', battleId] as const,
    globalChat: (battleId: string) => [...queryKeys.battles.all, 'globalChat', battleId] as const,
  },
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => [...queryKeys.agents.all, 'detail', id] as const,
    policy: (id: string) => [...queryKeys.agents.all, 'policy', id] as const,
    quota: (id: string, date?: string) => [...queryKeys.agents.all, 'quota', id, date] as const,
    actions: (id: string) => [...queryKeys.agents.all, 'actions', id] as const,
    bindings: (id: string) => [...queryKeys.agents.all, 'bindings', id] as const,
  },
  reputation: {
    all: ['reputation'] as const,
    scores: (lenserId: string) => [...queryKeys.reputation.all, 'scores', lenserId] as const,
    ratings: (lenserId: string) => [...queryKeys.reputation.all, 'ratings', lenserId] as const,
    calibration: (lenserId: string) => [...queryKeys.reputation.all, 'calibration', lenserId] as const,
  },
  benchmark: {
    all: ['benchmark'] as const,
    suites: (filter?: string) => [...queryKeys.benchmark.all, 'suites', filter] as const,
    suite: (id: string) => [...queryKeys.benchmark.all, 'suite', id] as const,
    tasks: (suiteId: string) => [...queryKeys.benchmark.all, 'tasks', suiteId] as const,
    results: (suiteId: string) => [...queryKeys.benchmark.all, 'results', suiteId] as const,
    protocols: (suiteId: string) => [...queryKeys.benchmark.all, 'protocols', suiteId] as const,
  },
}
