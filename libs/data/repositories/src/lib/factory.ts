/**
 * Repository factory — the single switching point between Supabase and file-storage backends.
 * When DATA_SOURCE=file, returns IndexedDB-backed file implementations (or stubs).
 * When DATA_SOURCE=supabase (default), returns the existing Supabase implementations.
 * No caller above the service layer is aware of this switch.
 */
import { isFileDataBackend } from '@lenserfight/utils/env'
import { fileModeStub } from './repositories/file/stub'

// ── Supabase implementations ──────────────────────────────────────────────────
import { SupabaseAuthRepository, type AuthRepositoryPort } from './repositories/authRepository'
import { SupabaseLenserRepository, type LenserRepositoryPort } from './repositories/lenserRepository'
import { SupabaseLensesRepository, type LensesRepositoryPort } from './repositories/lensesRepository'
import { SupabaseWorkflowsRepository, type WorkflowsRepositoryPort } from './repositories/workflowsRepository'
import { SupabaseAgentsRepository, type AgentsRepositoryPort } from './repositories/agentsRepository'
import { SupabaseAgentWorkspaceRepository, type AgentWorkspaceRepositoryPort } from './repositories/agentWorkspaceRepository'
import { SupabaseAICatalogRepository, type AICatalogRepositoryPort } from './repositories/aiCatalogRepository'
import { SupabaseAnalyticsRepository, type AnalyticsRepositoryPort } from './repositories/analyticsRepository'
import { SupabaseApiKeysRepository, type ApiKeysRepositoryPort } from './repositories/apiKeysRepository'
import { SupabaseContactRepository, type ContactRepositoryPort } from './repositories/contactRepository'
import { SupabaseExecutionRepository, type ExecutionRepositoryPort } from './repositories/executionRepository'
import { SupabaseFeedbackRepository, type FeedbackRepositoryPort } from './repositories/feedbackRepository'
import { SupabaseGenerationRepository, type GenerationRepositoryPort } from './repositories/generationRepository'
import { SupabaseMediaRepository, type MediaRepositoryPort } from './repositories/mediaRepository'
import { SupabasePreferencesRepository, type PreferencesRepositoryPort } from './repositories/preferencesRepository'
import { SupabaseReactionRepository, type ReactionRepositoryPort } from './repositories/reactionRepository'
import { SupabaseReputationRepository, type ReputationRepositoryPort } from './repositories/reputationRepository'
import { SupabaseResourcesRepository, type ResourcesRepositoryPort } from './repositories/resourcesRepository'
import { SupabaseShareRepository, type ShareRepositoryPort } from './repositories/shareRepository'
import { SupabaseSocialLinksRepository, type SocialLinksRepositoryPort } from './repositories/socialLinksRepository'
import { SupabaseTagFollowsRepository, type TagFollowsRepositoryPort } from './repositories/tagFollowsRepository'
import { SupabaseTagRepository, type TagRepositoryPort } from './repositories/tagRepository'
import { SupabaseThreadsRepository, type ThreadsRepositoryPort } from './repositories/threadsRepository'
import { SupabaseWaitingListRepository, type WaitingListRepositoryPort } from './repositories/waitingListRepository'
import { SupabaseXPRepository, type XPRepositoryPort } from './repositories/xpRepository'
import { SupabaseMemoryRepository, type MemoryRepository } from './repositories/memoryRepository'
import { SupabaseToolsRepository, type ToolsRepository } from './repositories/toolsRepository'
import { SupabaseRunReportsRepository, type RunReportsRepository } from './repositories/runReportsRepository'
import { SupabasePolicyEvaluationsRepository, type PolicyEvaluationsRepository } from './repositories/policyEvaluationsRepository'
import { SupabaseWorkspaceControlsRepository, type WorkspaceControlsRepository } from './repositories/workspaceControlsRepository'
import { SupabaseAgentAnalyticsRepository, type AgentAnalyticsRepository } from './repositories/agentAnalyticsRepository'

// ── File implementations ──────────────────────────────────────────────────────
import { FileAuthRepository } from './repositories/file/fileAuthRepository'
import { FileLenserRepository } from './repositories/file/fileLenserRepository'
import { FileLensesRepository } from './repositories/file/fileLensesRepository'
import { FileWorkflowsRepository } from './repositories/file/fileWorkflowsRepository'
import { FileAgentsRepository } from './repositories/file/fileAgentsRepository'

// ── Priority repos — fully implemented in file mode ───────────────────────────

export function createAuthRepository(): AuthRepositoryPort {
  return isFileDataBackend ? new FileAuthRepository() : new SupabaseAuthRepository()
}

export function createLenserRepository(): LenserRepositoryPort {
  return isFileDataBackend ? new FileLenserRepository() : new SupabaseLenserRepository()
}

export function createLensesRepository(): LensesRepositoryPort {
  return isFileDataBackend ? new FileLensesRepository() : new SupabaseLensesRepository()
}

export function createWorkflowsRepository(): WorkflowsRepositoryPort {
  return isFileDataBackend ? new FileWorkflowsRepository() : new SupabaseWorkflowsRepository()
}

export function createAgentsRepository(): AgentsRepositoryPort {
  return isFileDataBackend ? new FileAgentsRepository() : new SupabaseAgentsRepository()
}

// ── Stub repos — return empty/no-op in file mode ─────────────────────────────

export function createAgentWorkspaceRepository(): AgentWorkspaceRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<AgentWorkspaceRepositoryPort>('AgentWorkspaceRepository')
    : new SupabaseAgentWorkspaceRepository()
}

export function createAICatalogRepository(): AICatalogRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<AICatalogRepositoryPort>('AICatalogRepository')
    : new SupabaseAICatalogRepository()
}

export function createAnalyticsRepository(): AnalyticsRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<AnalyticsRepositoryPort>('AnalyticsRepository')
    : new SupabaseAnalyticsRepository()
}

export function createApiKeysRepository(): ApiKeysRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ApiKeysRepositoryPort>('ApiKeysRepository')
    : new SupabaseApiKeysRepository()
}

export function createContactRepository(): ContactRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ContactRepositoryPort>('ContactRepository')
    : new SupabaseContactRepository()
}

export function createExecutionRepository(): ExecutionRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ExecutionRepositoryPort>('ExecutionRepository')
    : new SupabaseExecutionRepository()
}

export function createFeedbackRepository(): FeedbackRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<FeedbackRepositoryPort>('FeedbackRepository')
    : new SupabaseFeedbackRepository()
}

export function createGenerationRepository(): GenerationRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<GenerationRepositoryPort>('GenerationRepository')
    : new SupabaseGenerationRepository()
}

export function createMediaRepository(): MediaRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<MediaRepositoryPort>('MediaRepository')
    : new SupabaseMediaRepository()
}

export function createPreferencesRepository(): PreferencesRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<PreferencesRepositoryPort>('PreferencesRepository')
    : new SupabasePreferencesRepository()
}

export function createReactionRepository(): ReactionRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ReactionRepositoryPort>('ReactionRepository')
    : new SupabaseReactionRepository()
}

export function createReputationRepository(): ReputationRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ReputationRepositoryPort>('ReputationRepository')
    : new SupabaseReputationRepository()
}

export function createResourcesRepository(): ResourcesRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ResourcesRepositoryPort>('ResourcesRepository')
    : new SupabaseResourcesRepository()
}

export function createShareRepository(): ShareRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ShareRepositoryPort>('ShareRepository')
    : new SupabaseShareRepository()
}

export function createSocialLinksRepository(): SocialLinksRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<SocialLinksRepositoryPort>('SocialLinksRepository')
    : new SupabaseSocialLinksRepository()
}

export function createTagFollowsRepository(): TagFollowsRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<TagFollowsRepositoryPort>('TagFollowsRepository')
    : new SupabaseTagFollowsRepository()
}

export function createTagRepository(): TagRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<TagRepositoryPort>('TagRepository')
    : new SupabaseTagRepository()
}

export function createThreadsRepository(): ThreadsRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<ThreadsRepositoryPort>('ThreadsRepository')
    : new SupabaseThreadsRepository()
}

export function createWaitingListRepository(): WaitingListRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<WaitingListRepositoryPort>('WaitingListRepository')
    : new SupabaseWaitingListRepository()
}

export function createXPRepository(): XPRepositoryPort {
  return isFileDataBackend
    ? fileModeStub<XPRepositoryPort>('XPRepository')
    : new SupabaseXPRepository()
}

export function createMemoryRepository(): MemoryRepository {
  return isFileDataBackend
    ? fileModeStub<MemoryRepository>('MemoryRepository')
    : new SupabaseMemoryRepository()
}

export function createToolsRepository(): ToolsRepository {
  return isFileDataBackend
    ? fileModeStub<ToolsRepository>('ToolsRepository')
    : new SupabaseToolsRepository()
}

export function createRunReportsRepository(): RunReportsRepository {
  return isFileDataBackend
    ? fileModeStub<RunReportsRepository>('RunReportsRepository')
    : new SupabaseRunReportsRepository()
}

export function createPolicyEvaluationsRepository(): PolicyEvaluationsRepository {
  return isFileDataBackend
    ? fileModeStub<PolicyEvaluationsRepository>('PolicyEvaluationsRepository')
    : new SupabasePolicyEvaluationsRepository()
}

export function createWorkspaceControlsRepository(): WorkspaceControlsRepository {
  return isFileDataBackend
    ? fileModeStub<WorkspaceControlsRepository>('WorkspaceControlsRepository')
    : new SupabaseWorkspaceControlsRepository()
}

export function createAgentAnalyticsRepository(): AgentAnalyticsRepository {
  return isFileDataBackend
    ? fileModeStub<AgentAnalyticsRepository>('AgentAnalyticsRepository')
    : new SupabaseAgentAnalyticsRepository()
}

export const agentAnalyticsRepository = createAgentAnalyticsRepository()
