import { supabase } from '@lenserfight/data/supabase'

export interface RecordAttestationInput {
  runId: string
  deviceId?: string
  signed?: boolean
  signature?: string
  gatewayVerified?: boolean
  deviceTrusted?: boolean
  policyPassed?: boolean
  workflowHash?: string
  lensHash?: string
  agentConfigHash?: string
  runnerVersion?: string
  cliVersion?: string
}

export interface RecordSignedAttestationInput {
  runId: string
  envelopeKid: string
  envelopeIat: string
  envelopeNonce: string
  /** RFC 4648 base64url (no padding) of the JCS-canonical envelope bytes. */
  canonicalJcsB64Url: string
  /** RFC 4648 base64url of the raw 64-byte Ed25519 signature. */
  signatureB64Url: string
  workflowHash?: string
  lensHash?: string
  agentConfigHash?: string
  runnerVersion?: string
  cliVersion?: string
  policyPassed?: boolean
}

export interface GatewayAttestationRepositoryPort {
  recordAttestation(input: RecordAttestationInput): Promise<string>
  /**
   * Phase F (RFC-0003) — record a signed attestation AND verify its Ed25519
   * signature in a single transaction. Verification result is always persisted
   * to `execution.attestation_verifications`; `fn_compute_submission_trust`
   * refuses to award `execution_verified` or higher unless that row says
   * `verified = true`.
   */
  recordSignedAttestation(input: RecordSignedAttestationInput): Promise<string>
  computeSubmissionTrust(submissionId: string): Promise<string>
  getSubmissionTrust(submissionId: string): Promise<{
    submission_id: string
    trust_level: string
    factors: unknown
    attestation_id: string | null
    evaluated_at: string
  } | null>
}

export class SupabaseGatewayAttestationRepository
  implements GatewayAttestationRepositoryPort
{
  async recordAttestation(input: RecordAttestationInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_record_execution_attestation', {
      p_run_id: input.runId,
      p_device_id: input.deviceId ?? null,
      p_signed: input.signed ?? false,
      p_signature: input.signature ?? null,
      p_gateway_verified: input.gatewayVerified ?? false,
      p_device_trusted: input.deviceTrusted ?? false,
      p_policy_passed: input.policyPassed ?? false,
      p_workflow_hash: input.workflowHash ?? null,
      p_lens_hash: input.lensHash ?? null,
      p_agent_config_hash: input.agentConfigHash ?? null,
      p_runner_version: input.runnerVersion ?? null,
      p_cli_version: input.cliVersion ?? null,
    })
    if (error) throw error
    return String(data)
  }

  async recordSignedAttestation(input: RecordSignedAttestationInput): Promise<string> {
    const { data, error } = await supabase.rpc('fn_record_signed_attestation', {
      p_run_id: input.runId,
      p_envelope_kid: input.envelopeKid,
      p_envelope_iat: input.envelopeIat,
      p_envelope_nonce: input.envelopeNonce,
      p_canonical_jcs_b64url: input.canonicalJcsB64Url,
      p_signature_b64url: input.signatureB64Url,
      p_workflow_hash: input.workflowHash ?? null,
      p_lens_hash: input.lensHash ?? null,
      p_agent_config_hash: input.agentConfigHash ?? null,
      p_runner_version: input.runnerVersion ?? null,
      p_cli_version: input.cliVersion ?? null,
      p_policy_passed: input.policyPassed ?? false,
    })
    if (error) throw error
    return String(data)
  }

  async computeSubmissionTrust(submissionId: string): Promise<string> {
    const { data, error } = await supabase.rpc('fn_compute_submission_trust', {
      p_submission_id: submissionId,
    })
    if (error) throw error
    return String(data)
  }

  async getSubmissionTrust(submissionId: string) {
    const { data, error } = await supabase.rpc('fn_get_submission_trust', {
      p_submission_id: submissionId,
    })
    if (error) throw error
    const rows = Array.isArray(data) ? data : data ? [data] : []
    return rows[0] ?? null
  }
}

export const gatewayAttestationRepository =
  new SupabaseGatewayAttestationRepository()
