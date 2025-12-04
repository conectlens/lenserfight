
import { AIGeneration, CreateGenerationDTO, MediaLibraryItem, GenerationFilterOptions } from '../types/generation.types';
import { supabase } from '../utils/supabase';
import { storage } from '../utils/storage';

export interface GenerationRepositoryPort {
  getGenerationsForPrompt(promptId: string, lenserId: string, options?: GenerationFilterOptions): Promise<AIGeneration[]>;
  createGeneration(data: CreateGenerationDTO): Promise<AIGeneration>;
  deleteGeneration(id: string): Promise<void>;
}

export class MockGenerationRepository implements GenerationRepositoryPort {
  private GENERATIONS_KEY = 'mock_ai_generations';
  private MEDIA_KEY = 'mock_media_library';

  constructor() {
    this.seed();
  }

  private seed() {
    // Seed some initial data for demo if empty
    if (!storage.getItem(this.GENERATIONS_KEY)) {
       // Seed logic can remain or be expanded
    }
  }

  private getGenerations(): AIGeneration[] {
    return JSON.parse(storage.getItem(this.GENERATIONS_KEY) || '[]');
  }

  private getMedia(): MediaLibraryItem[] {
    return JSON.parse(storage.getItem(this.MEDIA_KEY) || '[]');
  }

  async getGenerationsForPrompt(promptId: string, lenserId: string, options: GenerationFilterOptions = {}): Promise<AIGeneration[]> {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    const allGens = this.getGenerations();
    const allMedia = this.getMedia();

    const { limit = 20, offset = 0, mediaKind = 'all', aiModelId = 'all' } = options;

    // Filter by prompt
    let filtered = allGens.filter(g => g.prompt_template_id === promptId);

    // Join media
    let joined = filtered.map(g => ({
        ...g,
        media: allMedia.find(m => m.id === g.media_id)
    }));

    // Apply Filters
    if (mediaKind !== 'all') {
        joined = joined.filter(g => g.media?.media_kind === mediaKind);
    }

    if (aiModelId !== 'all') {
        joined = joined.filter(g => g.ai_model_id === aiModelId);
    }

    // Sort by Date Desc
    joined.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Paginate
    return joined.slice(offset, offset + limit);
  }

  async createGeneration(dto: CreateGenerationDTO): Promise<AIGeneration> {
    await new Promise(resolve => setTimeout(resolve, 800));

    // 1. Create Media
    const mediaId = `media-${Date.now()}`;
    const newMedia: MediaLibraryItem = {
        id: mediaId,
        lenser_id: dto.lenser_id,
        created_at: new Date().toISOString(),
        ...dto.media
    };
    const allMedia = this.getMedia();
    allMedia.push(newMedia);
    storage.setItem(this.MEDIA_KEY, JSON.stringify(allMedia));

    // 2. Create Generation
    const newGen: AIGeneration = {
        id: `gen-${Date.now()}`,
        lenser_id: dto.lenser_id,
        ai_model_id: dto.ai_model_id,
        prompt_template_id: dto.prompt_template_id,
        media_id: mediaId,
        media: newMedia,
        input_text: dto.input_text,
        output_type: dto.media.media_kind,
        visibility: dto.visibility || 'private',
        created_at: new Date().toISOString(),
        original_chat_url: dto.original_chat_url
    };

    const allGens = this.getGenerations();
    allGens.push(newGen);
    storage.setItem(this.GENERATIONS_KEY, JSON.stringify(allGens));

    return newGen;
  }

  async deleteGeneration(id: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 400));
    let allGens = this.getGenerations();
    const gen = allGens.find(g => g.id === id);
    
    if (gen) {
        // Cascade delete media in mock
        let allMedia = this.getMedia();
        allMedia = allMedia.filter(m => m.id !== gen.media_id);
        storage.setItem(this.MEDIA_KEY, JSON.stringify(allMedia));
    }

    allGens = allGens.filter(g => g.id !== id);
    storage.setItem(this.GENERATIONS_KEY, JSON.stringify(allGens));
  }
}

export class SupabaseGenerationRepository implements GenerationRepositoryPort {
  async getGenerationsForPrompt(promptId: string, lenserId: string, options: GenerationFilterOptions = {}): Promise<AIGeneration[]> {
    const { limit = 20, offset = 0, mediaKind = 'all', aiModelId = 'all' } = options;

    let query = supabase
        .from('ai_generations')
        .select(`
            *,
            media:media_library(*)
        `)
        .eq('prompt_template_id', promptId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (aiModelId !== 'all') {
        query = query.eq('ai_model_id', aiModelId);
    }

    if (mediaKind !== 'all') {
        query = query.eq('media_library.media_kind', mediaKind); 
    }

    const { data, error } = await query;

    if (error) throw error;
    
    let results = data.map((d: any) => ({
        ...d,
        media: Array.isArray(d.media) ? d.media[0] : d.media
    })) as AIGeneration[];

    // Fallback client-side filtering if backend join filter didn't apply perfectly
    if (mediaKind !== 'all') {
        results = results.filter(r => r.media?.media_kind === mediaKind);
    }

    return results;
  }

  async createGeneration(dto: CreateGenerationDTO): Promise<AIGeneration> {
    // 1. Insert Media
    const { data: media, error: mediaError } = await supabase
        .from('media_library')
        .insert({
            lenser_id: dto.lenser_id,
            ...dto.media
        })
        .select()
        .single();

    if (mediaError) throw mediaError;

    // 2. Insert Generation
    const { data: gen, error: genError } = await supabase
        .from('ai_generations')
        .insert({
            lenser_id: dto.lenser_id,
            ai_model_id: dto.ai_model_id,
            prompt_template_id: dto.prompt_template_id,
            media_id: media.id,
            input_text: dto.input_text,
            output_type: dto.media.media_kind,
            visibility: dto.visibility || 'private',
            original_chat_url: dto.original_chat_url
        })
        .select()
        .single();

    if (genError) throw genError;

    return { ...gen, media } as AIGeneration;
  }

  async deleteGeneration(id: string): Promise<void> {
    const { error } = await supabase.from('ai_generations').delete().eq('id', id);
    if (error) throw error;
  }
}
