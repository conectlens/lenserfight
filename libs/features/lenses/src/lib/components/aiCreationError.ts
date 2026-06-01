import type { AICreationErrorCode } from '@lenserfight/infra/ai-creation'

/**
 * Map an AI-creation error code to a short, user-facing title.
 * Shared by GenerateWithAIButton and the create modals/wizards.
 */
export function friendlyAIError(code: AICreationErrorCode | string): string {
  switch (code) {
    case 'PROMPT_TOO_LONG':    return 'Prompt too long'
    case 'TIMEOUT':            return 'Request timed out'
    case 'RATE_LIMITED':       return 'Too many requests'
    case 'CREDIT_EXHAUSTED':   return 'Credits or quota exhausted'
    case 'PROVIDER_ERROR':     return 'AI provider error'
    case 'PARSE_ERROR':        return 'Unexpected AI response'
    case 'NO_LOCAL_KEY':       return 'No local BYOK key configured'
    case 'GATEWAY_ERROR':      return 'Gateway connection failed'
    case 'UNAUTHORIZED':       return 'Not authorized'
    default:                   return 'Generation failed'
  }
}
