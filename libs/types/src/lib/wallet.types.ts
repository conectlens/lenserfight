export interface WalletBalance {
  balance: number
}

export interface WalletTransaction {
  id: string
  tx_type: 'spend' | 'deposit' | 'refund'
  amount: number
  direction: 1 | -1
  balance_after: number
  description: string
  reference_type: string
  reference_id: string
  created_at: string
}

export interface WalletPricingModel {
  key: string
  name: string
  provider: string
  provider_name: string
  unit_type: 'tokens' | 'image'
  sample_cost_usd: number
  sample_cost_credits: number
}

export type MessageRole = 'system' | 'user' | 'assistant'

export interface Message {
  role: MessageRole
  content: string
}

export interface TokenUsage {
  input_tokens: number
  output_tokens: number
}

export interface ExecuteRequest {
  provider: 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'
  model: string
  messages: Message[]
  max_tokens?: number
  temperature?: number
}

export interface ExecuteResponse {
  content: string
  usage: TokenUsage
  provider: string
  model: string
  credits_charged: number
}

export interface ExecuteByokRequest {
  key_ref_id: string
  provider?: 'openai' | 'anthropic' | 'google' | 'mistral' | 'ollama'
  model: string
  messages: Message[]
  max_tokens?: number
  temperature?: number
}

export interface ExecuteBYOKResponse {
  content: string
  usage: TokenUsage
  provider: string
  model: string
}

export interface ExecuteImageRequest {
  provider: 'fal'
  model: string
  prompt: string
  num_images?: number
  image_size?: 'square_hd' | 'square' | 'landscape_4_3' | 'portrait_4_3'
}

export interface ExecuteImageResponse {
  urls: string[]
  units: number
  credits_charged: number
}

export type StreamState = 'idle' | 'loading' | 'streaming' | 'complete' | 'error'

export interface StreamUsage {
  input_tokens: number
  output_tokens: number
}

export interface StreamResult {
  content: string
  runId: string
  usage: StreamUsage
  credits_charged: number
}

export interface StreamCallbacks {
  onStart: (runId: string) => void
  onToken: (content: string) => void
  onEnd: (usage: StreamUsage, creditsCharged: number) => void
  onError: (message: string, code: string) => void
}
