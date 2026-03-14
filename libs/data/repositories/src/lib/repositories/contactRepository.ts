import { ContactMessage, CreateContactDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

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
