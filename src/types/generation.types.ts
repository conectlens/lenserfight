
export type MediaKind = 'image' | 'video' | 'audio' | 'text' | 'file';

export interface MediaLibraryItem {
  id: string;
  lenser_id: string;
  url: string;
  file_name: string;
  mime_type: string;
  media_kind: MediaKind;
  width?: number;
  height?: number;
  duration_seconds?: number;
  created_at: string;
}

export interface AIModel {
  id: string;
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface AIGeneration {
  id: string;
  lenser_id: string;
  ai_model_id: string; // e.g., 'gpt-4', 'midjourney-v6'
  prompt_template_id: string;
  media_id: string;
  media?: MediaLibraryItem; // Joined data
  input_text?: string;
  output_type?: string;
  visibility: 'public' | 'private';
  created_at: string;
  original_chat_url?: string | null;
}

export interface CreateGenerationDTO {
  prompt_template_id: string;
  lenser_id: string;
  ai_model_id: string;
  media: Omit<MediaLibraryItem, 'id' | 'created_at'>; 
  input_text?: string;
  visibility?: 'public' | 'private';
  original_chat_url?: string | null;
}

export interface GenerationFilterOptions {
  limit?: number;
  offset?: number;
  mediaKind?: MediaKind | 'all';
  aiModelId?: string | 'all';
}

// Using valid UUIDs to prevent PostgreSQL 22P02 errors
export const AI_MODELS = [
  { id: '00000000-0000-0000-0000-000000000001', label: 'Midjourney' },
  { id: '00000000-0000-0000-0000-000000000002', label: 'DALL·E 3' },
  { id: '00000000-0000-0000-0000-000000000003', label: 'Stable Diffusion' },
  { id: '00000000-0000-0000-0000-000000000004', label: 'ChatGPT' },
  { id: '00000000-0000-0000-0000-000000000005', label: 'Claude' },
  { id: '00000000-0000-0000-0000-000000000006', label: 'Grok' },
  { id: '00000000-0000-0000-0000-000000000007', label: 'Runway Gen-2' },
  { id: '00000000-0000-0000-0000-000000000008', label: 'Sora' }
];