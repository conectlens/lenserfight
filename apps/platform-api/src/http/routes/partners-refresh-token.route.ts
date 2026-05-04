import type { IncomingMessage, ServerResponse } from 'node:http'
import { partnerRegistry } from '@lenserfight/infra/partner-provisioning'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { createServiceSupabaseClient } from '../../lib/supabase'
import { PartnerProvisioningService } from '../../lib/partners/partners.service'

export async function handlePartnersRefreshTokenRoute(
  req: IncomingMessage,
  res: ServerResponse,
  partnerName: string,
  _requestId: string,
  _startedAt: number,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const provider = partnerRegistry.get(partnerName)
  const service = new PartnerProvisioningService(createServiceSupabaseClient())
  await service.refreshToken(provider, auth.user.id)
  res.writeHead(204)
  res.end()
}
