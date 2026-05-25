import { renderTemplateWithSnapshot } from '@lenserfight/domain/lens-parameters'
import type { ContentPart, ProviderMessage } from '@lenserfight/providers'
import type { LensVersionParam, LensParam } from '@lenserfight/types'
import { renderLens } from '@lenserfight/utils/text'

import type { MediaDeliveryPurpose } from '@lenserfight/data/repositories'
import { resolveLensFileParamsForExecution } from './resolveLensFileParamsForExecution'

export async function buildLabStreamMessages(input: {
  lensContent: string
  inputSnapshot: Record<string, unknown>
  versionParams?: LensVersionParam[]
  params?: LensParam[]
  /** How file params are exposed to the model. Lab BYOK defaults to inlining images. */
  fileDeliveryPurpose?: MediaDeliveryPurpose
}): Promise<ProviderMessage[]> {
  const {
    lensContent,
    inputSnapshot,
    versionParams,
    params,
    fileDeliveryPurpose = 'provider_browser',
  } = input

  if (versionParams && versionParams.length > 0) {
    const { snapshotForPrompt, fileParts } = await resolveLensFileParamsForExecution(
      inputSnapshot,
      versionParams,
      fileDeliveryPurpose,
    )
    const text = renderTemplateWithSnapshot(lensContent, snapshotForPrompt, versionParams)
    if (fileParts.length === 0) {
      return [{ role: 'user', content: text }]
    }
    const content: ContentPart[] = [{ type: 'text', text }, ...fileParts]
    return [{ role: 'user', content }]
  }

  const text = renderLens(lensContent, inputSnapshot, params ?? [])
  return [{ role: 'user', content: text }]
}
