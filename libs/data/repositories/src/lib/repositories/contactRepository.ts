import { CreateContactDTO } from '@lenserfight/types'
import { supabase } from '@lenserfight/data/supabase'

export interface ContactRepositoryPort {
  submitMessage(dto: CreateContactDTO): Promise<void>
}

export class SupabaseContactRepository implements ContactRepositoryPort {
  async submitMessage(dto: CreateContactDTO): Promise<void> {
    const { error } = await supabase.rpc('fn_ops_submit_contact', {
      p_name: dto.name,
      p_email: dto.email,
      p_subject: dto.subject,
      p_message: dto.message,
      p_kvkk_approved: dto.kvkk_approved,
      p_ip_address: dto.ip_address ?? null,
      p_user_agent: dto.user_agent ?? null,
    })

    if (error) throw error
  }
}
