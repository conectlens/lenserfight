export const queryKeys = {
  threads: {
    all: ['threads'] as const,
    feed: () => [...queryKeys.threads.all, 'feed'] as const,
    trending: (lang?: string) => [...queryKeys.threads.all, 'trending', lang] as const,
    personal: (lenserId: string) => [...queryKeys.threads.all, 'personal', lenserId] as const,
    following: (lenserId: string) => [...queryKeys.threads.all, 'following', lenserId] as const,
    detail: (id: string) => [...queryKeys.threads.all, 'detail', id] as const,
  },
  lenses: {
    all: ['lenses'] as const,
    feed: (filter?: object) => [...queryKeys.lenses.all, 'feed', filter] as const,
    top: ['lenses', 'top'] as const,
    trending: (lang?: string) => [...queryKeys.lenses.all, 'trending', lang] as const,
    personal: (lenserId: string) => [...queryKeys.lenses.all, 'personal', lenserId] as const,
    byOwner: (lenserId: string) => [...queryKeys.lenses.all, 'byOwner', lenserId] as const,
    following: (lenserId: string) => [...queryKeys.lenses.all, 'following', lenserId] as const,
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
    myLensers: () => [...queryKeys.lenser.all, 'myLensers'] as const,
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
    history: (lenserId: string) => [...queryKeys.xp.all, 'history', lenserId] as const,
    streak: (lenserId: string) => [...queryKeys.xp.all, 'streak', lenserId] as const,
    levelUps: (lenserId: string) => [...queryKeys.xp.all, 'levelUps', lenserId] as const,
    seasons: (appId: string) => [...queryKeys.xp.all, 'seasons', appId] as const,
    seasonLeaderboard: (appId: string, seasonId?: string) => [...queryKeys.xp.all, 'seasonLeaderboard', appId, seasonId] as const,
    badges: (lenserId: string) => [...queryKeys.xp.all, 'badges', lenserId] as const,
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
  aiCatalog: {
    all: ['ai-catalog'] as const,
    providers: () => [...queryKeys.aiCatalog.all, 'providers'] as const,
    models: (filter?: Record<string, unknown>) => [...queryKeys.aiCatalog.all, 'models', filter ?? {}] as const,
    modelDetail: (providerKey: string, modelKey: string) =>
      [...queryKeys.aiCatalog.all, 'model', providerKey, modelKey] as const,
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
    feed: (filter?: string, sortBy?: string, battleType?: string) => [...queryKeys.battles.all, 'feed', filter, sortBy, battleType] as const,
    detail: (slug: string) => [...queryKeys.battles.all, 'detail', slug] as const,
    contenders: (battleId: string) => [...queryKeys.battles.all, 'contenders', battleId] as const,
    aggregates: (battleId: string) => [...queryKeys.battles.all, 'aggregates', battleId] as const,
    scorecard: (battleId: string) => [...queryKeys.battles.all, 'scorecard', battleId] as const,
    comments: (battleId: string) => [...queryKeys.battles.all, 'comments', battleId] as const,
    globalChat: (battleId: string) => [...queryKeys.battles.all, 'globalChat', battleId] as const,
    lensAssignment: (contenderId: string) => [...queryKeys.battles.all, 'lensAssignment', contenderId] as const,
    trending: (cursor?: number) => [...queryKeys.battles.all, 'trending', cursor ?? null] as const,
    lenserboard: () => [...queryKeys.battles.all, 'lenserboard'] as const,
    aiJudgeVerdicts: (battleId: string) => [...queryKeys.battles.all, 'aiJudgeVerdicts', battleId] as const,
    executionJobs: (battleId: string) => [...queryKeys.battles.all, 'executionJobs', battleId] as const,
    dlq: (battleId: string) => [...queryKeys.battles.all, 'dlq', battleId] as const,
  },
  workflows: {
    all: ['workflows'] as const,
    byLenser: (lenserId: string) => [...queryKeys.workflows.all, 'lenser', lenserId] as const,
    feed: (lenserId: string, filter?: object) => [...queryKeys.workflows.all, 'feed', lenserId, filter] as const,
    popular: (filter?: object) => [...queryKeys.workflows.all, 'popular', filter ?? {}] as const,
    templates: (limit?: number) => [...queryKeys.workflows.all, 'templates', limit ?? 12] as const,
    detail: (id: string) => [...queryKeys.workflows.all, 'detail', id] as const,
    reactions: (id: string) => [...queryKeys.workflows.all, 'reactions', id] as const,
    nodes: (id: string) => [...queryKeys.workflows.all, 'nodes', id] as const,
    edges: (id: string) => [...queryKeys.workflows.all, 'edges', id] as const,
    schedules: (workflowId?: string | null) =>
      [...queryKeys.workflows.all, 'schedules', workflowId ?? 'all'] as const,
    run: (runId: string) => [...queryKeys.workflows.all, 'run', runId] as const,
    nodeResults: (runId: string) => [...queryKeys.workflows.all, 'nodeResults', runId] as const,
    versions: (id: string) => [...queryKeys.workflows.all, 'versions', id] as const,
    phases: (workflowId: string) => [...queryKeys.workflows.all, 'phases', workflowId] as const,
    tasks: (phaseId: string) => [...queryKeys.workflows.all, 'tasks', phaseId] as const,
    tasksByWorkflow: (workflowId: string) => [...queryKeys.workflows.all, 'tasksByWorkflow', workflowId] as const,
  },
  agents: {
    all: ['agents'] as const,
    detail: (id: string) => [...queryKeys.agents.all, 'detail', id] as const,
    detailByProfile: (profileId: string) => [...queryKeys.agents.all, 'detailByProfile', profileId] as const,
    policy: (id: string) => [...queryKeys.agents.all, 'policy', id] as const,
    quota: (id: string, date?: string) => [...queryKeys.agents.all, 'quota', id, date] as const,
    actions: (id: string) => [...queryKeys.agents.all, 'actions', id] as const,
    automationFeed: (id: string) => [...queryKeys.agents.all, 'automationFeed', id] as const,
    lensBindings: (id: string) => [...queryKeys.agents.all, 'lensBindings', id] as const,
    modelBindings: (id: string) => [...queryKeys.agents.all, 'modelBindings', id] as const,
    bindings: (id: string) => [...queryKeys.agents.all, 'bindings', id] as const,
    workspaceBootstrap: (handle: string) => [...queryKeys.agents.all, 'workspaceBootstrap', handle] as const,
    teams: (aiLenserId: string) => [...queryKeys.agents.all, 'teams', aiLenserId] as const,
    approvals: (aiLenserId: string, status?: string) =>
      [...queryKeys.agents.all, 'approvals', aiLenserId, status ?? 'pending'] as const,
    approvalRequest: (requestId: string) =>
      [...queryKeys.agents.all, 'approval', requestId] as const,
    humanActivityFeed: (humanLenserId: string, limit?: number, offset?: number) =>
      [...queryKeys.agents.all, 'humanActivityFeed', humanLenserId, limit, offset] as const,
    costSummary: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'costSummary', aiLenserId] as const,
    memoryProfiles: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'memoryProfiles', aiLenserId] as const,
    memoryEntries: (profileId: string, scope: string = 'all') =>
      [...queryKeys.agents.all, 'memoryEntries', profileId, scope] as const,
    memoryAccessLogs: (memoryId: string) =>
      [...queryKeys.agents.all, 'memoryAccessLogs', memoryId] as const,
    memoryProfileSummary: (profileId: string) =>
      [...queryKeys.agents.all, 'memoryProfileSummary', profileId] as const,
    scratchpadRuns: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'scratchpadRuns', aiLenserId] as const,
    evaluations: (ownerLenserId: string) =>
      [...queryKeys.agents.all, 'evaluations', ownerLenserId] as const,
    evaluationRuns: (evaluationId: string) =>
      [...queryKeys.agents.all, 'evaluationRuns', evaluationId] as const,
    evaluationRun: (runId: string) =>
      [...queryKeys.agents.all, 'evaluationRun', runId] as const,
    evaluationResults: (runId: string) =>
      [...queryKeys.agents.all, 'evaluationResults', runId] as const,
    toolRegistry: (ownerLenserId: string) =>
      [...queryKeys.agents.all, 'toolRegistry', ownerLenserId] as const,
    toolAssignments: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'toolAssignments', aiLenserId] as const,
    toolInvocations: (
      scope: { aiLenserId?: string; teamRunId?: string; status?: string } = {}
    ) =>
      [
        ...queryKeys.agents.all,
        'toolInvocations',
        scope.aiLenserId ?? '',
        scope.teamRunId ?? '',
        scope.status ?? '',
      ] as const,
    toolApprovalQueue: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'toolApprovalQueue', aiLenserId] as const,
    fleetOverview: (humanLenserId: string) =>
      [...queryKeys.agents.all, 'fleetOverview', humanLenserId] as const,
    fleetRuns: (
      humanLenserId: string,
      filters?: Record<string, unknown>
    ) =>
      [
        ...queryKeys.agents.all,
        'fleetRuns',
        humanLenserId,
        filters ?? {},
      ] as const,
    fleetLogs: (
      humanLenserId: string,
      filters?: Record<string, unknown>
    ) =>
      [
        ...queryKeys.agents.all,
        'fleetLogs',
        humanLenserId,
        filters ?? {},
      ] as const,
    workspaceSettings: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'workspaceSettings', aiLenserId] as const,
    runEvents: (aiLenserId: string, runId?: string, eventType?: string) =>
      [
        ...queryKeys.agents.all,
        'runEvents',
        aiLenserId,
        runId ?? 'all',
        eventType ?? '',
      ] as const,
    providers: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'providers', aiLenserId] as const,
    runSteps: (aiLenserId: string, runId: string) =>
      [...queryKeys.agents.all, 'runSteps', aiLenserId, runId] as const,
    workflowAssignments: (aiLenserId: string) =>
      [...queryKeys.agents.all, 'workflowAssignments', aiLenserId] as const,
    evaluationCases: (evaluationId: string) =>
      [...queryKeys.agents.all, 'evaluationCases', evaluationId] as const,
    // Phase 8: Autonomous Agent OS
    runReports: (aiLenserId: string, limit?: number) =>
      [...queryKeys.agents.all, 'runReports', aiLenserId, limit ?? 20] as const,
    runReport: (reportId: string) =>
      [...queryKeys.agents.all, 'runReport', reportId] as const,
    runIncidents: (runReportId: string) =>
      [...queryKeys.agents.all, 'runIncidents', runReportId] as const,
    policyLog: (
      aiLenserId: string,
      filters?: { verdict?: string; policy_type?: string; limit?: number }
    ) =>
      [
        ...queryKeys.agents.all,
        'policyLog',
        aiLenserId,
        filters?.verdict ?? '',
        filters?.policy_type ?? '',
        filters?.limit ?? 20,
      ] as const,
    runUnified: (
      aiLenserId: string,
      filters?: { status?: string; run_type?: string; limit?: number }
    ) =>
      [
        ...queryKeys.agents.all,
        'runUnified',
        aiLenserId,
        filters?.status ?? '',
        filters?.run_type ?? '',
        filters?.limit ?? 20,
      ] as const,
    analyticsSummary: (
      aiLenserId: string,
      options?: { days?: number; modelKey?: string; workflowId?: string }
    ) => [...queryKeys.agents.all, 'analyticsSummary', aiLenserId, options ?? {}] as const,
  },
  reputation: {
    all: ['reputation'] as const,
    scores: (lenserId: string) => [...queryKeys.reputation.all, 'scores', lenserId] as const,
    ratings: (lenserId: string) => [...queryKeys.reputation.all, 'ratings', lenserId] as const,
    calibration: (lenserId: string) => [...queryKeys.reputation.all, 'calibration', lenserId] as const,
  },
}
