import { defaultPassphraseProvider, LocalKeyStore } from '@lenserfight/data/local-keys'
import { AICreationService } from '@lenserfight/infra/ai-creation/sublayer'

import { callEdgeFunction } from '../../utils/api'
import { getUserInfo } from '../../utils/auth'

import type {
  AICreationError,
  AICreationOutput,
  BattleCreationContext,
  GenerationType,
  LensCreationContext,
  WorkflowCreationContext,
} from '@lenserfight/infra/ai-creation/sublayer'

export type CliFundingSource = 'platform_credit' | 'user_byok_cloud' | 'user_byok_local'

export interface GenerateCreationArgs {
  generationType: GenerationType
  /** null/empty → recommendation mode. */
  prompt: string | null
  /** auth.uid() of the signed-in lenser (must match the JWT for the server path). */
  profileId: string
  funding: CliFundingSource
  providerKey: string
  modelKey: string
  /** Required when funding = user_byok_cloud. */
  keyRefId?: string | null
  /** Required when funding = user_byok_local. */
  localKeyId?: string | null
  context?: LensCreationContext | WorkflowCreationContext | BattleCreationContext
}

interface EdgeOk {
  ok: true
  output: AICreationOutput
  mode: 'prompted' | 'recommendation'
}
interface EdgeErr {
  ok: false
  error: { code: string; message: string }
}

/**
 * Run a lens/workflow/battle AI generation from the CLI.
 *
 * - `user_byok_local` resolves the key from the local keystore and calls the
 *   provider directly through the shared AICreationService (same sublayer the
 *   web app uses — no prompt duplication).
 * - `platform_credit` / `user_byok_cloud` delegate to the generate-creation
 *   edge function, which resolves the Chainabit token or decrypts the vault key
 *   server-side.
 */
export async function generateCreation(args: GenerateCreationArgs): Promise<AICreationOutput> {
  const context = args.context ?? {}

  if (args.funding === 'user_byok_local') {
    if (!args.localKeyId) {
      throw new Error('Local BYOK requires --local-key-id <id>. List keys with `lf keys list`.')
    }
    const store = new LocalKeyStore({ passphraseProvider: defaultPassphraseProvider })
    const service = new AICreationService((id) => store.resolve(id))
    const result = await service.generate(
      { generationType: args.generationType, prompt: args.prompt, profileId: args.profileId, context },
      {
        fundingSource: 'user_byok_local',
        modelId: args.modelKey,
        providerId: args.providerKey,
        selectedKeyRefId: null,
        localKeyId: args.localKeyId,
      },
    )
    if (result.ok) return result.output
    // The CLI tsconfig is non-strict, so the boolean-discriminant complement
    // ({ ok: false }) isn't auto-narrowed here — assert the error shape.
    const err = (result as { error: AICreationError }).error
    throw new Error(`${err.code}: ${err.message}`)
  }

  if (args.funding === 'user_byok_cloud' && !args.keyRefId) {
    throw new Error('Cloud BYOK requires --byok-key-ref <uuid>.')
  }

  const res = await callEdgeFunction<EdgeOk | EdgeErr>(
    'generate-creation',
    {
      generation_type: args.generationType,
      prompt: args.prompt,
      profile_id: args.profileId,
      context,
      funding_source: args.funding,
      key_ref_id: args.keyRefId ?? null,
      provider_key: args.providerKey,
      model_key: args.modelKey,
    },
    { requireAuth: true },
  )
  // callEdgeFunction throws on non-2xx; this guards the defensive 200+{ok:false} case.
  if (res.ok) return res.output
  const err = (res as EdgeErr).error
  throw new Error(`${err.code}: ${err.message}`)
}

/** Resolve the signed-in lenser's auth.uid() (required as profile_id). */
export async function resolveProfileId(): Promise<string> {
  const user = await getUserInfo()
  const id = user?.['id']
  if (typeof id !== 'string' || !id) {
    throw new Error('Not signed in. Run `lf auth login` first.')
  }
  return id
}

/** Normalize the CLI `--funding` flag (accepts the short alias `cloud`/`local`). */
export function normalizeFunding(value: string): CliFundingSource {
  switch (value) {
    case 'platform_credit':
    case 'platform':
      return 'platform_credit'
    case 'user_byok_cloud':
    case 'cloud':
      return 'user_byok_cloud'
    case 'user_byok_local':
    case 'local':
      return 'user_byok_local'
    default:
      throw new Error(`Invalid --funding "${value}". Use platform_credit | cloud | local.`)
  }
}
