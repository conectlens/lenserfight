import { TriggerExecutionDTO } from '@lenserfight/types'
import { SupabaseExecutionRepository } from '../repositories/executionRepository'
import { HttpExecutionApiClient } from '../repositories/executionApiClient'

const repo = new SupabaseExecutionRepository()
const apiClient = new HttpExecutionApiClient()

export const executionService = {
  getHistory: (promptId: string, limit?: number, offset?: number) =>
    repo.getExecutionHistoryForPrompt(promptId, limit, offset),

  getRunById: (runId: string) =>
    repo.getRunById(runId),

  getArtifacts: (runId: string) =>
    repo.getArtifactsForRun(runId),

  pollStatus: (runId: string) =>
    repo.pollRunStatus(runId),

  triggerExecution: (dto: TriggerExecutionDTO) =>
    apiClient.triggerExecution(dto),
}
