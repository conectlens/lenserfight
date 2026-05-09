import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@lenserfight/data/supabase', () => ({
  supabase: {
    rpc: mockRpc,
  },
}))

import { SupabaseGatewayAttestationRepository } from './gatewayAttestationRepository'

describe('SupabaseGatewayAttestationRepository', () => {
  let repo: SupabaseGatewayAttestationRepository

  beforeEach(() => {
    vi.clearAllMocks()
    repo = new SupabaseGatewayAttestationRepository()
  })

  it('records signed attestations through the server-side verify RPC', async () => {
    mockRpc.mockResolvedValue({ data: 'attestation-1', error: null })

    const id = await repo.recordSignedAttestation({
      runId: 'run-1',
      envelopeKid: 'device-1',
      envelopeIat: '2026-05-09T00:00:00Z',
      envelopeNonce: 'nonce-123',
      canonicalJcsB64Url: 'eyJhIjoxfQ',
      signatureB64Url: 'sig',
      workflowHash: 'workflow-hash',
      lensHash: 'lens-hash',
      policyPassed: true,
    })

    expect(id).toBe('attestation-1')
    expect(mockRpc).toHaveBeenCalledWith('fn_record_signed_attestation', {
      p_run_id: 'run-1',
      p_envelope_kid: 'device-1',
      p_envelope_iat: '2026-05-09T00:00:00Z',
      p_envelope_nonce: 'nonce-123',
      p_canonical_jcs_b64url: 'eyJhIjoxfQ',
      p_signature_b64url: 'sig',
      p_workflow_hash: 'workflow-hash',
      p_lens_hash: 'lens-hash',
      p_agent_config_hash: null,
      p_runner_version: null,
      p_cli_version: null,
      p_policy_passed: true,
    })
  })

  it('throws when the server rejects the signed attestation', async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error('signature_invalid') })

    await expect(
      repo.recordSignedAttestation({
        runId: 'run-1',
        envelopeKid: 'device-1',
        envelopeIat: '2026-05-09T00:00:00Z',
        envelopeNonce: 'nonce-123',
        canonicalJcsB64Url: 'payload',
        signatureB64Url: 'bad-signature',
      })
    ).rejects.toThrow('signature_invalid')
  })
})
