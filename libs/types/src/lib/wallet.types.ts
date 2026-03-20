export interface WalletProduct {
  id: string
  variantId: string
  name: string
  description: string
  thumb_url?: string | null
  large_thumb_url?: string | null
  price: number
  price_formatted: string
  pay_what_you_want: boolean
  test_mode: boolean
}

export interface WalletCheckoutRequest {
  variantId: string
  email?: string
}

export interface WalletCheckoutResponse {
  checkoutUrl: string
  checkout_url?: string
  checkoutId: string
  checkout_id?: string
}

export interface WalletBalance {
  balance: number
}

export interface WalletExecuteRequest {
  provider: string
  model: string
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
  max_tokens?: number
  temperature?: number
}

export interface WalletExecuteResponse {
  content: string
  usage: { input_tokens: number; output_tokens: number }
  provider: string
  model: string
  credits_charged: number
}
