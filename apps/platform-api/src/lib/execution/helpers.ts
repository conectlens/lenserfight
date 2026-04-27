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

function isUuid(input: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)
}

export async function resolveLens(serviceClient: SupabaseClient, lensIdOrSlug: string): Promise<ResolvedLens> {
  const query = serviceClient
    .schema('lenses')
    .from('lenses')
    .select('id, head_version_id')
    .limit(1)

  const { data, error } = isUuid(lensIdOrSlug)
    ? await query.eq('id', lensIdOrSlug).maybeSingle()
    : await query.eq('slug', lensIdOrSlug).maybeSingle()

  if (error || !data) {
    throw new Error('Lens not found')
  }

  return {
    id: data.id as string,
    headVersionId: (data.head_version_id as string | null) ?? null,
  }
}

export async function resolveModel(
  serviceClient: SupabaseClient,
  request: LensExecuteRequest,
): Promise<ResolvedModel> {
  let providerIdFilter: string | null = null
  if (request.providerOverride) {
    const { data: providerRow, error: providerError } = await serviceClient
      .schema('ai')
      .from('providers')
      .select('id')
      .eq('key', request.providerOverride)
      .maybeSingle()

    if (providerError || !providerRow) {
      throw new Error('Requested provider not found')
    }
    providerIdFilter = providerRow.id as string
  }

  let query = serviceClient
    .schema('ai')
    .from('models')
    .select('id, key, provider_id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (providerIdFilter) {
    query = query.eq('provider_id', providerIdFilter)
  }

  const modelRow = request.modelOverride
    ? (await query.or(`id.eq.${request.modelOverride},key.eq.${request.modelOverride}`).limit(1).maybeSingle())
    : (await query.limit(1).maybeSingle())

  if ('error' in modelRow && modelRow.error) {
    throw new Error(modelRow.error.message)
  }

  const row = Array.isArray(modelRow.data)
    ? modelRow.data[0]
    : modelRow.data

  if (!row) {
    throw new Error('No active model found')
  }

  const { data: provider, error: providerError } = await serviceClient
    .schema('ai')
    .from('providers')
    .select('key')
    .eq('id', row.provider_id as string)
    .maybeSingle()

  if (providerError || !provider) {
    throw new Error('Provider not found for model')
  }

  return {
    id: row.id as string,
    key: row.key as string,
    providerKey: provider.key as string,
  }
}

export async function validateCloudByokOwnership(
  userClient: SupabaseClient,
  byokKeyRefId: string,
  providerKey: string,
): Promise<void> {
  const { data, error } = await userClient.rpc('fn_get_my_api_keys')
  if (error) throw error

  const key = (Array.isArray(data) ? data : []).find(
    (item) => item.id === byokKeyRefId,
  ) as { provider_key?: string } | undefined

  if (!key) {
    throw new Error('BYOK key not found or not owned by the current user')
  }

  if (key.provider_key !== providerKey) {
    throw new Error('BYOK key provider does not match the selected model provider')
  }
}
