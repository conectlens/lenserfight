
import { ContactMessage, CreateContactDTO } from '../types/contact.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface ContactRepositoryPort {
  submitMessage(dto: CreateContactDTO): Promise<ContactMessage>;
}

export class MockContactRepository implements ContactRepositoryPort {
  private STORAGE_KEY = 'mock_contact_messages';

  async submitMessage(dto: CreateContactDTO): Promise<ContactMessage> {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network

    const newMessage: ContactMessage = {
      id: `contact-${Date.now()}`,
      ...dto,
      user_agent: dto.user_agent || 'Mock Agent',
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    };

    const existingJson = storage.getItem(this.STORAGE_KEY);
    const existing = existingJson ? JSON.parse(existingJson) : [];
    existing.push(newMessage);
    storage.setItem(this.STORAGE_KEY, JSON.stringify(existing));

    console.group("Mock Contact Message Submitted");
    console.log("Payload:", newMessage);
    console.groupEnd();

    return newMessage;
  }
}

export class SupabaseContactRepository implements ContactRepositoryPort {
  async submitMessage(dto: CreateContactDTO): Promise<ContactMessage> {
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        lenser_id: dto.lenser_id || null,
        name: dto.name,
        email: dto.email,
        subject: dto.subject,
        message: dto.message,
        kvkk_approved: dto.kvkk_approved,
        user_agent: dto.user_agent
      })
      .select()
      .single();

    if (error) {
      // Handle RLS policy violation specifically for better UX
      if (error.code === '42501') {
        throw new Error("Permission denied. Please ensure you have accepted the privacy policy.");
      }
      throw error;
    }

    return data as ContactMessage;
  }
}
