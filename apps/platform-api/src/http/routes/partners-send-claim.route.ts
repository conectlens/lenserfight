import type { IncomingMessage, ServerResponse } from 'node:http'
import { partnerRegistry } from '@lenserfight/infra/partner-provisioning'
import { authenticateRequest } from '../../lib/auth/authenticate'
import { sendSuccess } from '../../lib/http'
import { createServiceSupabaseClient } from '../../lib/supabase'
import { PartnerProvisioningService } from '../../lib/partners/partners.service'

export async function handlePartnersSendClaimRoute(
  req: IncomingMessage,
  res: ServerResponse,
  partnerName: string,
  requestId: string,
  startedAt: number,
): Promise<void> {
  const auth = await authenticateRequest(req)
  const provider = partnerRegistry.get(partnerName)
  const service = new PartnerProvisioningService(createServiceSupabaseClient())
  await service.sendClaimEmail(provider, auth.user.id)
  sendSuccess(res, 200, { sent: true }, requestId, startedAt)
}
