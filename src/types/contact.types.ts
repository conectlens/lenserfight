export interface ContactMessage {
  id: string
  lenser_id?: string | null
  name: string
  email: string
  subject: string
  message: string
  kvkk_approved: boolean
  user_agent?: string | null
  ip_address?: string | null
  created_at: string
}

export interface CreateContactDTO {
  lenser_id?: string | null
  name: string
  email: string
  subject: string
  message: string
  kvkk_approved: boolean
  user_agent?: string
  ip_address?: string
}
