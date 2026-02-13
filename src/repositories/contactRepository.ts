import { ContactMessage, CreateContactDTO } from '../types/contact.types'
import { supabase } from '../utils/supabase'

export interface ContactRepositoryPort {
  submitMessage(dto: CreateContactDTO): Promise<void>
}

export class SupabaseContactRepository implements ContactRepositoryPort {
  async submitMessage(dto: CreateContactDTO): Promise<void> {
    await supabase.rpc('fn_ops_create_contact', {
      p_name: dto.name,
      p_email: dto.email,
      p_subject: dto.subject,
      p_message: dto.message,
      p_kvkk_approved: dto.kvkk_approved,
      p_ip_address: dto.ip_address ?? null,
      p_user_agent: dto.user_agent ?? null,
    })
  }
}
