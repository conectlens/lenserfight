import { ContactMessage, CreateContactDTO } from '../types/contact.types'
import { supabase } from '../core/supabase/client'

export interface ContactRepositoryPort {
  submitMessage(dto: CreateContactDTO): Promise<void>
}

export class SupabaseContactRepository implements ContactRepositoryPort {
  async submitMessage(dto: CreateContactDTO): Promise<void> {
    const { error } = await supabase.schema('ops').from('contact').insert({
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
      kvkk_approved: dto.kvkk_approved,
      ip_address: dto.ip_address ?? null,
      user_agent: dto.user_agent ?? null,
    })

    if (error) throw error
  }
}
