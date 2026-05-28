import type {
  CompleteToolInvocationInput,
  InvokeToolInput,
  ListToolInvocationsOptions,
  ToolInvocationRecord,
} from '@lenserfight/types'
import { createToolsRepository } from '../factory'



const toolsRepo = createToolsRepository()

export const toolsService = {
  listInvocations: (
    options?: ListToolInvocationsOptions
  ): Promise<ToolInvocationRecord[]> => toolsRepo.listInvocations(options),

  listPendingApprovals: (aiLenserId: string): Promise<ToolInvocationRecord[]> =>
    toolsRepo.listPendingApprovals(aiLenserId),

  invokeTool: (input: InvokeToolInput): Promise<string> => toolsRepo.invokeTool(input),

  completeInvocation: (input: CompleteToolInvocationInput): Promise<void> =>
    toolsRepo.completeInvocation(input),

  approveInvocation: (invocationId: string): Promise<void> =>
    toolsRepo.approveInvocation(invocationId),

  rejectInvocation: (invocationId: string, reason?: string): Promise<void> =>
    toolsRepo.rejectInvocation(invocationId, reason),
}
