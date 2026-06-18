import { supabase } from '@lenserfight/data/supabase'

export interface SavedPreset {
  id: string
  lenser_id: string
  lens_id: string
  lens_version_id: string
  name: string
  note: string | null
  values: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface CreateSavedPresetInput {
  lenser_id: string
  lens_id: string
  lens_version_id: string
  name: string
  note?: string
  values: Record<string, unknown>
}

export interface UpdateSavedPresetInput {
  name?: string
  note?: string
  values?: Record<string, unknown>
}

export interface SavedPresetsRepositoryPort {
  listSavedPresets(lensVersionId: string): Promise<SavedPreset[]>
  createSavedPreset(input: CreateSavedPresetInput): Promise<SavedPreset>
  updateSavedPreset(id: string, input: UpdateSavedPresetInput): Promise<SavedPreset>
  deleteSavedPreset(id: string): Promise<void>
}

export class SupabaseSavedPresetsRepository implements SavedPresetsRepositoryPort {
  async listSavedPresets(lensVersionId: string): Promise<SavedPreset[]> {
    const { data, error } = await supabase
      .from('saved_presets')
      .select('*')
      .eq('lens_version_id', lensVersionId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as SavedPreset[]
  }

  async createSavedPreset(input: CreateSavedPresetInput): Promise<SavedPreset> {
    const { data, error } = await supabase
      .from('saved_presets')
      .insert({
        lenser_id: input.lenser_id,
        lens_id: input.lens_id,
        lens_version_id: input.lens_version_id,
        name: input.name,
        note: input.note ?? null,
        values: input.values,
      })
      .select()
      .single()

    if (error) throw error
    return data as SavedPreset
  }

  async updateSavedPreset(id: string, input: UpdateSavedPresetInput): Promise<SavedPreset> {
    const { data, error } = await supabase
      .from('saved_presets')
      .update({
        ...(input.name \!== undefined ? { name: input.name } : {}),
        ...(input.note \!== undefined ? { note: input.note } : {}),
        ...(input.values \!== undefined ? { values: input.values } : {}),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as SavedPreset
  }

  async deleteSavedPreset(id: string): Promise<void> {
    const { error } = await supabase
      .from('saved_presets')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}

export const savedPresetsRepository = new SupabaseSavedPresetsRepository()
