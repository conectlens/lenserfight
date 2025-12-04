
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

export const AI_MODELS = [
  { id: 'midjourney', label: 'Midjourney' },
  { id: 'dalle-3', label: 'DALL·E 3' },
  { id: 'stable-diffusion', label: 'Stable Diffusion' },
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'claude', label: 'Claude' },
  { id: 'grok', label: 'Grok' },
  { id: 'runway', label: 'Runway Gen-2' },
  { id: 'sora', label: 'Sora' }
];
