import { supabase } from '@lenserfight/data/supabase'
import {
  SavedParameterPreset,
  CreateSavedPresetInput,
  UpdateSavedPresetInput,
} from '@lenserfight/types'

export class SavedPresetsRepository {
  private handleError(error: unknown) {
    const normalizedError = error as { code?: string; message?: string }
    if (!error) return
    if (
      normalizedError.code === '42501' ||
      normalizedError.message?.includes('permission denied')
    ) {
      throw new Error('This resource is private or hidden and cannot be accessed.')
    }
    if (normalizedError.code === 'PGRST116') {
      throw new Error('Requested resource was not found.')
    }
    throw error
  }

  async listSavedPresets(lensVersionId: string): Promise<SavedParameterPreset[]> {
    const { data, error } = await supabase.rpc('fn_list_saved_presets', {
      p_lens_version_id: lensVersionId,
    })
    if (error) this.handleError(error)
    return (data ?? []) as SavedParameterPreset[]
  }

  async createSavedPreset(input: CreateSavedPresetInput): Promise<SavedParameterPreset> {
    const { data, error } = await supabase.rpc('fn_create_saved_preset', {
      p_lens_id: input.lens_id,
      p_lens_version_id: input.lens_version_id,
      p_name: input.name,
      p_note: input.note ?? null,
      p_values: input.values ?? {},
    })
    if (error) this.handleError(error)
    return data as SavedParameterPreset
  }

  async updateSavedPreset(
    id: string,
    input: UpdateSavedPresetInput,
  ): Promise<SavedParameterPreset> {
    const { data, error } = await supabase.rpc('fn_update_saved_preset', {
      p_preset_id: id,
      p_name: input.name ?? null,
      p_note: input.note ?? null,
      p_values: input.values ?? null,
    })
    if (error) this.handleError(error)
    return data as SavedParameterPreset
  }

  async deleteSavedPreset(id: string): Promise<void> {
    const { error } = await supabase.rpc('fn_delete_saved_preset', {
      p_preset_id: id,
    })
    if (error) this.handleError(error)
  }
}

export const savedPresetsRepository = new SavedPresetsRepository()
