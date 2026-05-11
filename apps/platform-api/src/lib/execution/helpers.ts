import type { SupabaseClient } from '@supabase/supabase-js'
import type { LensExecuteRequest } from '@lenserfight/api/contracts'

export interface ResolvedModel {
  id: string
  key: string
  providerKey: string
}

export interface ResolvedLens {
  id: string
  headVersionId: string | null
}

export async function resolveLens(serviceClient: SupabaseClient, lensIdOrSlug: string): Promise<ResolvedLens> {
  const { data, error } = await serviceClient
    .rpc('fn_get_lens_for_execution', { p_lens_id: lensIdOrSlug })

  if (error) {
    throw new Error('Lens not found')
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('Lens not found')
  }

  return {
    id: row.id as string,
    headVersionId: (row.head_version_id as string | null) ?? null,
  }
}

export async function resolveModel(
  serviceClient: SupabaseClient,
  request: LensExecuteRequest,
): Promise<ResolvedModel> {
  const { data, error } = await serviceClient
    .rpc('fn_resolve_execution_model', {
      p_provider_override: request.providerOverride ?? null,
      p_model_override: request.modelOverride ?? null,
    })

  if (error) {
    throw new Error(error.message)
  }

  const row = Array.isArray(data) ? data[0] : data
  if (!row) {
    throw new Error('No active model found')
  }

  return {
    id: row.model_id as string,
    key: row.model_key as string,
    providerKey: row.provider_key as string,
  }
}

export async function validateCloudByokOwnership(
  userClient: SupabaseClient,
  byokKeyRefId: string,
  providerKey: string,
): Promise<void> {
  const { data, error } = await userClient.rpc('fn_get_my_api_keys')
  if (error) throw error

  const keys = (Array.isArray(data) ? data : []) as Array<{ id?: string; provider_key?: string }>
  const key = keys.find((item) => item.id === byokKeyRefId)

  if (!key) {
    throw new Error('BYOK key not found or not owned by the current user')
  }

  if (key.provider_key !== providerKey) {
    throw new Error('BYOK key provider does not match the selected model provider')
  }
}
