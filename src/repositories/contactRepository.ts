import { ContactMessage, CreateContactDTO } from '../types/contact.types'
import { storage } from '../utils/storage'
import { supabase } from '../utils/supabase'

export interface ContactRepositoryPort {
  submitMessage(dto: CreateContactDTO): Promise<void>
}

export class MockContactRepository implements ContactRepositoryPort {
  private STORAGE_KEY = 'mock_contact_messages'

  async submitMessage(dto: CreateContactDTO): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate network

    const newMessage: ContactMessage = {
      id: `contact-${Date.now()}`,
      ...dto,
      user_agent: dto.user_agent || 'Mock Agent',
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    }

    const existingJson = storage.getItem(this.STORAGE_KEY)
    const existing = existingJson ? JSON.parse(existingJson) : []
    existing.push(newMessage)
    storage.setItem(this.STORAGE_KEY, JSON.stringify(existing))

    console.group('Mock Contact Message Submitted')
    console.log('Payload:', newMessage)
    console.groupEnd()
  }
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
