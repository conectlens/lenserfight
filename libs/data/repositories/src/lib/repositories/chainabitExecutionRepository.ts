import { chainabitExecutionClient } from '@lenserfight/infra/execution'
import type { ChainbitSubmitPayload, ChainbitJobStatus } from '@lenserfight/infra/execution'

export interface ChainbitBattleSubmitInput {
  jobId: string
  battleId: string
  slot: 'A' | 'B'
  prompt: string
  systemPrompt?: string
  providerKey: string
  modelKey: string
  apiKey: string
  maxTokens: number
  temperature: number
}

export interface ChainbitBattleResult {
  externalJobId: string
  status: ChainbitJobStatus['status']
  outputText?: string
  errorMessage?: string
}

export interface ChainbitExecutionRepositoryPort {
  submitBattleJob(input: ChainbitBattleSubmitInput): Promise<string>
  pollBattleJob(externalJobId: string): Promise<ChainbitBattleResult>
}

export class ChainbitExecutionRepository implements ChainbitExecutionRepositoryPort {
  async submitBattleJob(input: ChainbitBattleSubmitInput): Promise<string> {
    const payload: ChainbitSubmitPayload = {
      jobId: input.jobId,
      battleId: input.battleId,
      slot: input.slot,
      prompt: input.prompt,
      systemPrompt: input.systemPrompt,
      providerKey: input.providerKey,
      modelKey: input.modelKey,
      apiKey: input.apiKey,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
    }
    return chainabitExecutionClient.submitJob(payload)
  }

  async pollBattleJob(externalJobId: string): Promise<ChainbitBattleResult> {
    const status = await chainabitExecutionClient.pollJob(externalJobId)
    return {
      externalJobId: status.externalJobId,
      status: status.status,
      outputText: status.outputText,
      errorMessage: status.errorMessage,
    }
  }
}

export const chainabitExecutionRepository = new ChainbitExecutionRepository()
