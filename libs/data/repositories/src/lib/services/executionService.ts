import { TriggerExecutionDTO, SetArtifactVisibilityDTO, PersistLocalExecutionDTO } from '@lenserfight/types'
import { SupabaseExecutionRepository } from '../repositories/executionRepository'
import { HttpExecutionApiClient } from '../repositories/executionApiClient'

const repo = new SupabaseExecutionRepository()
const apiClient = new HttpExecutionApiClient()

export const executionService = {
  /** Fetch enriched execution history for a lens (uses fn_get_lens_execution_history RPC). */
  getHistoryForLens: (lensId: string, limit?: number, offset?: number) =>
    repo.getHistoryForLens(lensId, limit, offset),

  /** @deprecated Use getHistoryForLens instead. */
  getHistory: (promptId: string, limit?: number, offset?: number) =>
    repo.getHistoryForLens(promptId, limit, offset),

  getRunById: (runId: string) =>
    repo.getRunById(runId),

  getArtifacts: (runId: string) =>
    repo.getArtifactsForRun(runId),

  pollStatus: (runId: string) =>
    repo.pollRunStatus(runId),

  /** Alias for pollStatus — prefer this in new code. */
  pollRunStatus: (runId: string) =>
    repo.pollRunStatus(runId),

  triggerExecution: (dto: TriggerExecutionDTO) =>
    apiClient.triggerExecution(dto),

  setArtifactVisibility: (dto: SetArtifactVisibilityDTO) =>
    repo.setArtifactVisibility(dto),

  /** Persist a completed local BYOK execution to the database. Best-effort — stream output is already visible. */
  persistLocalExecution: (dto: PersistLocalExecutionDTO) =>
    repo.persistLocalExecution(dto),
}
